const db = require('../config/database');
const Mitfahrer = require('./Mitfahrer');

class Fahrt {
  // mitfahrer wird in derselben Transaktion angelegt: zuvor lief das INSERT der
  // Fahrt allein in einer Transaktion und die Mitfahrer danach ungeschuetzt -
  // ein Fehler dort hinterliess eine Fahrt ohne (oder mit halben) Mitfahrern.
  // partnerFahrtId: Gegenfahrt desselben Hin-und-Rueck-Paares. Die Verknuepfung
  // laeuft in derselben Transaktion — sonst entstuende bei einem Fehler eine
  // Rueckfahrt ohne Verbindung zur Hinfahrt.
  static async create(fahrtData, details, userId, mitfahrer = [], partnerFahrtId = null) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const {
        datum,
        anlass,
        kilometer,
        abrechnung,
        vonOrtId,
        nachOrtId,
        einmaligerVonOrt,
        einmaligerNachOrt,
        userId
      } = fahrtData;
      
      const [result] = await conn.execute(
        `INSERT INTO fahrten (
        datum, anlass, kilometer, abrechnung, 
        von_ort_id, nach_ort_id, einmaliger_von_ort, einmaliger_nach_ort, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          datum, anlass, kilometer, abrechnung, 
          vonOrtId || null, nachOrtId || null, 
          einmaligerVonOrt || null, einmaligerNachOrt || null, 
          userId
        ]
      );
      
      const fahrtId = result.insertId;

      for (const person of mitfahrer) {
        await conn.execute(
          'INSERT INTO mitfahrer (fahrt_id, name, arbeitsstaette, richtung) VALUES (?, ?, ?, ?)',
          [fahrtId, person.name, person.arbeitsstaette, person.richtung]
        );
      }

      if (partnerFahrtId) {
        const verknuepft = await Fahrt.verknuepfePaar(conn, fahrtId, partnerFahrtId, userId);
        if (verknuepft) {
          // Die Mitfahrer der Hinfahrt, die fuer beide Richtungen gelten, auf
          // die neue Rueckfahrt uebernehmen. Sonst muesste man sie dort von
          // Hand nachtragen, obwohl "Hin- und Rueckfahrt" schon dransteht.
          // Ohne geloeschte Eintraege (leere Liste): Beim Anlegen wird nur
          // ergaenzt, hier darf am Partner nichts verschwinden.
          await Mitfahrer.spiegleAufPartner(conn, partnerFahrtId, []);
        }
      }

      await conn.commit();
      return fahrtId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
  
  /**
   * Verknuepft zwei Fahrten wechselseitig als Hin-und-Rueck-Paar.
   * Beide Fahrten muessen dem Nutzer gehoeren — sonst liesse sich eine fremde
   * Fahrt an die eigene haengen und waere ueber die Partnerabfrage sichtbar.
   * Eine bestehende Verknuepfung der beiden wird dabei geloest.
   *
   * @param {object} conn - offene Verbindung (die Verknuepfung gehoert in
   *                        dieselbe Transaktion wie das Anlegen der Fahrt)
   */
  static async verknuepfePaar(conn, fahrtId, partnerId, userId) {
    if (!fahrtId || !partnerId || fahrtId === partnerId) return false;

    const [beide] = await conn.execute(
      'SELECT id FROM fahrten WHERE id IN (?, ?) AND user_id = ?',
      [fahrtId, partnerId, userId]
    );
    if (beide.length !== 2) return false;

    // Alte Partner beider Seiten loesen, sonst bleiben einseitige Verweise
    await conn.execute(
      'UPDATE fahrten SET partner_fahrt_id = NULL WHERE user_id = ? AND partner_fahrt_id IN (?, ?)',
      [userId, fahrtId, partnerId]
    );
    await conn.execute(
      'UPDATE fahrten SET partner_fahrt_id = ? WHERE id = ? AND user_id = ?',
      [partnerId, fahrtId, userId]
    );
    await conn.execute(
      'UPDATE fahrten SET partner_fahrt_id = ? WHERE id = ? AND user_id = ?',
      [fahrtId, partnerId, userId]
    );
    return true;
  }

  /**
   * Loest die Verknuepfung einer Fahrt — beidseitig.
   * Der FK steht auf ON DELETE SET NULL, beim Loeschen raeumt die DB also
   * selbst auf. Fuer alles andere (Fahrt bearbeiten, Paar trennen) braucht es
   * diesen Weg.
   */
  static async loesePaar(conn, fahrtId, userId) {
    const [rows] = await conn.execute(
      'SELECT partner_fahrt_id FROM fahrten WHERE id = ? AND user_id = ?',
      [fahrtId, userId]
    );
    const partnerId = rows[0]?.partner_fahrt_id;
    await conn.execute(
      'UPDATE fahrten SET partner_fahrt_id = NULL WHERE id = ? AND user_id = ?',
      [fahrtId, userId]
    );
    if (partnerId) {
      await conn.execute(
        'UPDATE fahrten SET partner_fahrt_id = NULL WHERE id = ? AND user_id = ?',
        [partnerId, userId]
      );
    }
    return partnerId || null;
  }

  static async findAll(userId) {
    const [rows] = await db.query(`
      SELECT 
        f.*, 
        COALESCE(v.name, f.einmaliger_von_ort) AS von_ort_name, 
        COALESCE(n.name, f.einmaliger_nach_ort) AS nach_ort_name 
      FROM fahrten f
      LEFT JOIN orte v ON f.von_ort_id = v.id
      LEFT JOIN orte n ON f.nach_ort_id = n.id
      WHERE f.user_id = ?
      ORDER BY f.datum DESC
    `, [userId]);
    return rows;
  }
  
  static async findById(id, userId) {
    if (id === undefined || id === null) {
      throw new Error('Ungültige ID für findById');
    }
    const [rows] = await db.execute(`
    SELECT f.*, 
            COALESCE(v.name, f.einmaliger_von_ort) AS von_ort_name, 
            COALESCE(v.adresse, f.einmaliger_von_ort) AS von_ort_adresse,
            COALESCE(n.name, f.einmaliger_nach_ort) AS nach_ort_name, 
            COALESCE(n.adresse, f.einmaliger_nach_ort) AS nach_ort_adresse
    FROM fahrten f
    LEFT JOIN orte v ON f.von_ort_id = v.id
    LEFT JOIN orte n ON f.nach_ort_id = n.id
    WHERE f.id = ? AND f.user_id = ?
  `, [id, userId]);
    return rows[0];
  }

  static async update(id, updateData, userId) {
    const {
      vonOrtId,
      nachOrtId,
      einmaligerVonOrt,
      einmaligerNachOrt,
      anlass,
      kilometer,
      abrechnung,
      datum
    } = updateData;
    
    const [result] = await db.execute(
      `UPDATE fahrten SET 
      von_ort_id = ?, 
      nach_ort_id = ?, 
      einmaliger_von_ort = ?,
      einmaliger_nach_ort = ?,
      anlass = ?, 
      kilometer = ?, 
      abrechnung = ?, 
      datum = ? 
    WHERE id = ? AND user_id = ?`,
      [
        vonOrtId || null, 
        nachOrtId || null, 
        einmaligerVonOrt || null,
        einmaligerNachOrt || null,
        anlass, 
        kilometer, 
        abrechnung,
        datum, 
        id, 
        userId
      ]
    );
    return result.affectedRows > 0;
  }

  static async updateFahrtenByDistanz(vonOrtId, nachOrtId, neueDistanz, userId) {
    const [result] = await db.execute(
      `UPDATE fahrten
      SET kilometer = ?
      WHERE ((von_ort_id = ? AND nach_ort_id = ?) OR (von_ort_id = ? AND nach_ort_id = ?)) AND user_id = ?`,
      [neueDistanz, vonOrtId, nachOrtId, nachOrtId, vonOrtId, userId]
    );
    return result.affectedRows;
  }
  
  // Loescht eine Fahrt und raeumt die gespiegelten Mitfahrer der Partnerfahrt
  // mit ab. Ohne das blieben nach dem Loeschen der Rueckfahrt die dortigen
  // "Hin- und Rueckfahrt"-Eintraege bestehen und wuerden weiter erstattet.
  // Die Fahrt selbst bleibt erhalten — geloescht wird nur, was zum Paar gehoert.
  static async delete(id, userId) {
    if (id === undefined || id === null) {
      throw new Error('Ungültige ID für delete');
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.execute(
        'SELECT partner_fahrt_id FROM fahrten WHERE id = ? AND user_id = ?',
        [id, userId]
      );
      const partnerId = rows[0]?.partner_fahrt_id || null;

      if (partnerId) {
        // Die Partnerfahrt bleibt bestehen — ihre Mitfahrer duerfen deshalb
        // NICHT verschwinden. Wer dort auf 'hin_rueck' steht, ist ab jetzt nur
        // noch fuer die verbleibende Richtung dabei: Ist die Partnerfahrt die
        // Hinfahrt (kleinere ID), wird daraus 'hin', sonst 'rueck'.
        const richtungDanach = partnerId < id ? 'hin' : 'rueck';
        await conn.execute(
          `UPDATE mitfahrer SET richtung = ?
           WHERE fahrt_id = ? AND richtung = 'hin_rueck'`,
          [richtungDanach, partnerId]
        );
      }

      const [result] = await conn.execute(
        'DELETE FROM fahrten WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      await conn.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  // Entfernt: getMonthlySummary() aggregierte ohne user_id-Filter ueber ALLE
  // Nutzer. Die Methode hatte keinen Aufrufer (der gleichnamige Controller
  // bringt eine eigene, korrekt gescopte Query mit), waere bei Nutzung aber
  // sofort ein Datenleck gewesen.

  static async getMonthlyReport(year, month, userId) {
    try {
      const query = `
      SELECT 
        f.*,
        COALESCE(v.name, f.einmaliger_von_ort) AS von_ort_name,
        COALESCE(v.adresse, f.einmaliger_von_ort) AS von_ort_adresse,
        COALESCE(n.name, f.einmaliger_nach_ort) AS nach_ort_name,
        COALESCE(n.adresse, f.einmaliger_nach_ort) AS nach_ort_adresse,
        m.id as mitfahrer_id,
        m.name as mitfahrer_name,
        m.arbeitsstaette,
        m.richtung
      FROM fahrten f
      LEFT JOIN orte v ON f.von_ort_id = v.id
      LEFT JOIN orte n ON f.nach_ort_id = n.id
      LEFT JOIN mitfahrer m ON m.fahrt_id = f.id
      WHERE YEAR(f.datum) = ? AND MONTH(f.datum) = ? AND f.user_id = ?
    `;
      const [rows] = await db.execute(query, [year, month, userId]);
      
      return rows;
    } catch (error) {
      console.error("DB Error:", error);
      throw error;
    }
  }
  
  
  static async getDateRangeReport(startYear, startMonth, endYear, endMonth, userId) {
    try {
      const startDate = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;
      // Calculate end date: first day of month after endMonth
      let endM = parseInt(endMonth) + 1;
      let endY = parseInt(endYear);
      if (endM > 12) { endM = 1; endY++; }
      const endDate = `${endY}-${String(endM).padStart(2, '0')}-01`;

      const query = `
      SELECT
        f.*,
        COALESCE(v.name, f.einmaliger_von_ort) AS von_ort_name,
        COALESCE(v.adresse, f.einmaliger_von_ort) AS von_ort_adresse,
        COALESCE(n.name, f.einmaliger_nach_ort) AS nach_ort_name,
        COALESCE(n.adresse, f.einmaliger_nach_ort) AS nach_ort_adresse,
        m.id as mitfahrer_id,
        m.name as mitfahrer_name,
        m.arbeitsstaette,
        m.richtung
      FROM fahrten f
      LEFT JOIN orte v ON f.von_ort_id = v.id
      LEFT JOIN orte n ON f.nach_ort_id = n.id
      LEFT JOIN mitfahrer m ON m.fahrt_id = f.id
      WHERE f.datum >= ? AND f.datum < ? AND f.user_id = ?
    `;
      const [rows] = await db.execute(query, [startDate, endDate, userId]);

      return rows;
    } catch (error) {
      console.error("DB Error:", error);
      throw error;
    }
  }

  // Entfernt: getYearSummary() gruppierte nach satz.kennzeichen, einer Spalte,
  // die die Abfrage gar nicht selektiert - alle Saetze landeten unter
  // undefined, das Ergebnis war immer 0. Ohne Aufrufer; der Controller hat
  // eine eigene Implementierung.
}

module.exports = Fahrt;