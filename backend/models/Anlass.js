const db = require('../config/database');

// Präfix "Rueckfahrt: " aus Altdaten, Hin- und Rückfahrt zählen als ein Anlass.
const ANLASS_OHNE_PRAEFIX = "TRIM(REGEXP_REPLACE(f.anlass, '^R.ckfahrt:[[:space:]]*', ''))";

class Anlass {
  /** Alle Anlässe mit Nutzungshäufigkeit, per Subquery, damit unbenutzte mit 0 erscheinen. */
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

  /** Legt einen Anlass an oder gibt den vorhandenen zurück, ein Duplikat ist im Modal der Normalfall. */
  static async create(userId, name, sortOrder = null) {
    const sauber = String(name).trim();

    const vorhanden = await Anlass.findByName(userId, sauber);
    if (vorhanden) {
      return { anlass: vorhanden, neu: false };
    }

    // Ohne Vorgabe ans Ende der Liste.
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
      // Bei parallelen Anfragen fängt der UNIQUE-Schlüssel ab, dann gilt der andere Eintrag.
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

  /** Aktualisiert nur übergebene Felder, damit Umsortieren den Namen nicht löscht. */
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

  /** Schreibt die Reihenfolge mehrerer Anlässe in einer Transaktion. */
  static async updateSortOrder(userId, sortOrder) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      for (const eintrag of sortOrder) {
        await connection.execute(
          'UPDATE anlaesse SET sort_order = ? WHERE id = ? AND user_id = ?',
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

  /** Löscht einen Anlass; Fahrten behalten ihren Text. */
  static async delete(id, userId) {
    const [result] = await db.execute(
      'DELETE FROM anlaesse WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = Anlass;
