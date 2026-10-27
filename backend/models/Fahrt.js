const db = require('../config/database');
const Mitfahrer = require('./Mitfahrer');

// Monatsgrenzen für `datum >= von AND datum < bis`, am Ende exklusiv.
function monatsGrenzen(year, month) {
  const j = parseInt(year, 10);
  const m = parseInt(month, 10);
  const naechsterMonat = m === 12 ? 1 : m + 1;
  const naechstesJahr = m === 12 ? j + 1 : j;
  const zweistellig = (n) => String(n).padStart(2, '0');
  return [
    `${j}-${zweistellig(m)}-01`,
    `${naechstesJahr}-${zweistellig(naechsterMonat)}-01`,
  ];
}

class Fahrt {
  // Mitfahrer und Paar-Verknüpfung in derselben Transaktion wie die Fahrt.
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
          // Mitfahrer für beide Richtungen auf die neue Rückfahrt übernehmen, am Partner verschwindet nichts.
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
  
  /** Verknüpft zwei eigene Fahrten wechselseitig als Paar, in der Transaktion von [conn]. */
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

  /** Löst die Verknüpfung beidseitig; beim Löschen übernimmt das der Fremdschlüssel. */
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
  
  // Löscht eine Fahrt samt gespiegelter Mitfahrer am Partner, sonst würden sie weiter erstattet.
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
        // Am verbleibenden Partner wird 'hin_rueck' zu 'hin' oder 'rueck', die kleinere ID ist die Hinfahrt.
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
      WHERE f.user_id = ? AND f.datum >= ? AND f.datum < ?
    `;
      // Datumsbereich statt YEAR()/MONTH(), damit der Index greift.
      const [von, bis] = monatsGrenzen(year, month);
      const [rows] = await db.execute(query, [userId, von, bis]);
      
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

}

module.exports = Fahrt;