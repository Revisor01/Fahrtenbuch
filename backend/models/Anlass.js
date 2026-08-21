const db = require('../config/database');

// Praefix "Rueckfahrt: " aus Altdaten. Hin- und Rueckfahrt tragen denselben
// Anlass, deshalb zaehlen sie fuer die Nutzungshaeufigkeit als einer.
// REGEXP_REPLACE statt fester Zeichenkette, damit auch Gross-/Kleinschreibung
// und mehrere Leerzeichen greifen.
const ANLASS_OHNE_PRAEFIX = "TRIM(REGEXP_REPLACE(f.anlass, '^R.ckfahrt:[[:space:]]*', ''))";

class Anlass {
  /**
   * Alle Anlaesse des Nutzers samt Nutzungshaeufigkeit aus fahrten.
   * Die Zaehlung laeuft ueber eine Subquery statt ueber einen JOIN mit
   * GROUP BY: so bleiben Anlaesse ohne jede Fahrt (frisch angelegt) mit
   * nutzung_anzahl = 0 in der Liste stehen.
   */
  static async findAll(userId) {
    const [rows] = await db.execute(
      `SELECT
         a.*,
         (
           SELECT COUNT(*)
           FROM fahrten f
           WHERE f.user_id = a.user_id
             AND ${ANLASS_OHNE_PRAEFIX} = a.name
         ) AS nutzung_anzahl
       FROM anlaesse a
       WHERE a.user_id = ?
       ORDER BY a.sort_order ASC, a.name ASC`,
      [userId]
    );
    return rows;
  }

  static async findById(id, userId) {
    const [rows] = await db.execute(
      'SELECT * FROM anlaesse WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return rows[0];
  }

  static async findByName(userId, name) {
    const [rows] = await db.execute(
      'SELECT * FROM anlaesse WHERE user_id = ? AND name = ?',
      [userId, name]
    );
    return rows[0];
  }

  /**
   * Legt einen Anlass an. Idempotent gegenueber dem UNIQUE-Schluessel
   * (user_id, name): existiert der Name bereits, wird der vorhandene Eintrag
   * zurueckgegeben. Das Frontend legt Anlaesse aus dem Erfassungs-Modal heraus
   * an - ein Duplikat ist dort kein Fehlerfall, sondern der Normalfall.
   */
  static async create(userId, name, sortOrder = null) {
    const sauber = String(name).trim();

    const vorhanden = await Anlass.findByName(userId, sauber);
    if (vorhanden) {
      return { anlass: vorhanden, neu: false };
    }

    // Ohne ausdrueckliche Vorgabe ans Ende der Liste. Eine feste 0 haette den
    // frisch angelegten Anlass ueber alle eingespielten gehoben - die tragen
    // aus der Migration ihren Haeufigkeitsrang, und ein gerade erst erfundener
    // Anlass ist selten der wichtigste.
    let rang = sortOrder;
    if (rang === null || rang === undefined) {
      const [zeilen] = await db.execute(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS naechster FROM anlaesse WHERE user_id = ?',
        [userId]
      );
      rang = zeilen[0]?.naechster ?? 0;
    }

    try {
      const [result] = await db.execute(
        'INSERT INTO anlaesse (user_id, name, sort_order) VALUES (?, ?, ?)',
        [userId, sauber, rang]
      );
      const anlass = await Anlass.findById(result.insertId, userId);
      return { anlass, neu: true };
    } catch (error) {
      // Zwei parallele Anfragen koennen die Pruefung oben gleichzeitig
      // passieren. Der UNIQUE-Schluessel faengt das ab - dann gilt der
      // Eintrag des anderen Laufs.
      if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
        const bestehend = await Anlass.findByName(userId, sauber);
        if (bestehend) {
          return { anlass: bestehend, neu: false };
        }
      }
      console.error('Fehler in Anlass.create:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert Name, Sortierung und Aktiv-Flag. Nur uebergebene Felder
   * werden angefasst, damit ein reines Umsortieren den Namen nicht loescht.
   */
  static async update(id, userId, daten) {
    const felder = [];
    const werte = [];

    if (daten.name !== undefined) {
      felder.push('name = ?');
      werte.push(String(daten.name).trim());
    }
    if (daten.sortOrder !== undefined) {
      felder.push('sort_order = ?');
      werte.push(daten.sortOrder);
    }
    if (daten.aktiv !== undefined) {
      felder.push('aktiv = ?');
      werte.push(daten.aktiv ? 1 : 0);
    }

    if (felder.length === 0) {
      return false;
    }

    werte.push(id, userId);
    const [result] = await db.execute(
      `UPDATE anlaesse SET ${felder.join(', ')} WHERE id = ? AND user_id = ?`,
      werte
    );
    return result.affectedRows > 0;
  }

  /**
   * Loescht einen Anlass. Bestehende Fahrten behalten ihren Text:
   * fahrten.anlass ist ein VARCHAR ohne Fremdschluessel auf diese Tabelle,
   * hier kaskadiert bewusst nichts.
   */
  static async delete(id, userId) {
    const [result] = await db.execute(
      'DELETE FROM anlaesse WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = Anlass;
