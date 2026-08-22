const db = require('../config/database');

class Ort {
  static async create(name, adresse, istWohnort, istDienstort, istKirchspiel, userId) {
    try {
      name = name || null;
      adresse = adresse || null;
      istWohnort = istWohnort || false;
      istDienstort = istDienstort || false;
      istKirchspiel = istKirchspiel || false;

      if (name === null || adresse === null) {
        throw new Error('Ungültige Parameter für create');
      }

      // Wohnort ist pro Nutzer eindeutig: Der Export zieht die Anschrift per
      // LEFT JOIN auf ist_wohnort = 1 und nimmt bei zwei Treffern einen
      // beliebigen. Das Frontend raeumt den alten ab — die API tat es nicht,
      // ueber sie liess sich ein zweiter Wohnort setzen.
      return await Ort.mitWohnortSperre(userId, istWohnort, async (connection) => {
        // Neue Orte ans Ende der Liste - eine feste 0 haette sie ueber alle
        // bestehenden gehoben und die vom Nutzer gezogene Reihenfolge
        // durcheinandergebracht. Innerhalb derselben Transaktion gelesen,
        // damit zwei parallele Anlagen nicht denselben Rang bekommen.
        const [zeilen] = await connection.execute(
          'SELECT COALESCE(MAX(sort_order), 0) + 1 AS naechster FROM orte WHERE user_id = ?',
          [userId]
        );
        const rang = zeilen[0]?.naechster ?? 1;

        const [result] = await connection.execute(
          'INSERT INTO orte (name, adresse, ist_wohnort, ist_dienstort, ist_kirchspiel, user_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [name, adresse, istWohnort ? 1 : 0, istDienstort ? 1 : 0, istKirchspiel ? 1 : 0, userId, rang]
        );
        return result.insertId;
      });
    } catch (error) {
      console.error('Fehler in Ort.create:', error);
      throw error;
    }
  }

  /**
   * Fuehrt eine schreibende Operation aus und stellt dabei sicher, dass danach
   * hoechstens ein Ort des Nutzers als Wohnort markiert ist. Setzt der Aufruf
   * keinen Wohnort, laeuft er unveraendert durch.
   *
   * @param {number} userId
   * @param {boolean} setztWohnort - markiert dieser Schreibvorgang einen Wohnort?
   * @param {(connection) => Promise<any>} arbeit - laeuft in derselben Transaktion
   * @param {number|null} ausnahmeId - Ort, der seine Markierung behalten soll (Update)
   */
  static async mitWohnortSperre(userId, setztWohnort, arbeit, ausnahmeId = null) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      if (setztWohnort) {
        // Erst die alten Markierungen loeschen, dann schreiben — sonst
        // entfernte das UPDATE die gerade gesetzte gleich wieder
        if (ausnahmeId === null) {
          await connection.execute(
            'UPDATE orte SET ist_wohnort = 0 WHERE user_id = ? AND ist_wohnort = 1',
            [userId]
          );
        } else {
          await connection.execute(
            'UPDATE orte SET ist_wohnort = 0 WHERE user_id = ? AND ist_wohnort = 1 AND id != ?',
            [userId, ausnahmeId]
          );
        }
      }

      const ergebnis = await arbeit(connection);
      await connection.commit();
      return ergebnis;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Alle Orte des Nutzers in seiner selbst gewaehlten Reihenfolge.
   *
   * Bisher stand hier gar kein ORDER BY - die Reihenfolge war das, was die DB
   * gerade hergab, und jede Ansicht sortierte im Frontend neu. Der Name als
   * Zweitkriterium haelt frisch angelegte Orte mit gleicher sort_order
   * beieinander.
   *
   * Wohnort und Dienstort werden hier bewusst NICHT vorgezogen: der
   * Erfassungs-Flow sortiert sie im Frontend ohnehin selbst nach vorn, und in
   * der Verwaltungsliste soll die vom Nutzer gezogene Reihenfolge gelten.
   */
  static async findAll(userId) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM orte WHERE user_id = ? ORDER BY sort_order ASC, name ASC',
        [userId]
      );
      return rows;
    } catch (error) {
      console.error('Fehler in Ort.findAll:', error);
      throw error;
    }
  }

  static async findById(id, userId) {
    try {
      if (id === undefined || id === null) {
        throw new Error('Ungültige ID für findById');
      }
      if (userId === undefined || userId === null) {
        throw new Error('findById erfordert eine userId');
      }
      // Ohne user_id-Filter lieferte diese Abfrage jedem angemeldeten Nutzer
      // Name und Adresse fremder Orte.
      const [rows] = await db.execute(
        'SELECT * FROM orte WHERE id = ? AND user_id = ?',
        [id, userId]
      );
      return rows[0];
    } catch (error) {
      console.error('Fehler in Ort.findById:', error);
      throw error;
    }
  }

  static async update(id, name, adresse, istWohnort, istDienstort, istKirchspiel, userId) {
    // Wie in create: setzt dieser Ort den Wohnort, verlieren die anderen ihre
    // Markierung — sonst haetten zwei Orte gleichzeitig ist_wohnort = 1
    return await Ort.mitWohnortSperre(userId, istWohnort, async (connection) => {
      const [result] = await connection.execute(
        'UPDATE orte SET name = ?, adresse = ?, ist_wohnort = ?, ist_dienstort = ?, ist_kirchspiel = ? WHERE id = ? AND user_id = ?',
        [name, adresse, istWohnort ? 1 : 0, istDienstort ? 1 : 0, istKirchspiel ? 1 : 0, id, userId]
      );
      return result.affectedRows > 0;
    }, id);
  }


  /**
   * Schreibt die Reihenfolge mehrerer Orte in einem Rutsch (Drag & Drop).
   * Transaktion: eine halb geschriebene Reihenfolge waere schlimmer als eine
   * gar nicht geschriebene.
   */
  static async updateSortOrder(userId, sortOrder) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      for (const eintrag of sortOrder) {
        await connection.execute(
          'UPDATE orte SET sort_order = ? WHERE id = ? AND user_id = ?',
          [eintrag.sort_order, eintrag.id, userId]
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async isUsedInFahrten(id, userId) {
    try {
      // Nur eigene Fahrten zaehlen - sonst haengt die Loeschentscheidung des
      // Nutzers an Fahrten anderer Leute.
      const [rows] = await db.execute(
        'SELECT COUNT(*) as count FROM fahrten WHERE (von_ort_id = ? OR nach_ort_id = ?) AND user_id = ?',
        [id, id, userId]
      );
      return rows[0].count > 0;
    } catch (error) {
      console.error('Fehler beim Überprüfen der Ort-Verwendung:', error);
      throw error;
    }
  }
  
  static async delete(id, userId) {
    try {
      const [result] = await db.execute('DELETE FROM orte WHERE id = ? AND user_id = ?', [id, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Fehler beim Löschen des Ortes:', error);
      throw error;
    }
  }
}

module.exports = Ort;