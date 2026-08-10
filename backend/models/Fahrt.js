const db = require('../config/database');

class Fahrt {
  static async create(fahrtData, details, userId) {
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
      
      await conn.commit();
      return fahrtId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
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
  
  static async delete(id, userId) {
    if (id === undefined || id === null) {
      throw new Error('Ungültige ID für delete');
    }
    const [result] = await db.execute('DELETE FROM fahrten WHERE id = ? AND user_id = ?', [id, userId]);
    return result.affectedRows > 0;
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