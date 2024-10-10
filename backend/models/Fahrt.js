const db = require('../config/database');

class Fahrt {
  static async create(fahrtData, details, userId) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      
      const { 
        datum, 
        anlass, 
        autosplit, 
        kilometer, 
        abrechnung, 
        vonOrtId, 
        nachOrtId, 
        einmaligerVonOrt, 
        einmaligerNachOrt 
      } = fahrtData;
      
      const [result] = await conn.execute(
        `INSERT INTO fahrten (
          datum, anlass, autosplit, kilometer, abrechnung, 
          von_ort_id, nach_ort_id, einmaliger_von_ort, einmaliger_nach_ort, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          datum, anlass, autosplit ? 1 : 0, kilometer, abrechnung, 
          vonOrtId || null, nachOrtId || null, einmaligerVonOrt || null, einmaligerNachOrt || null, userId
        ]
      );
      
      const fahrtId = result.insertId;
      
      if (autosplit && details && details.length) {
        for (const detail of details) {
          console.log('Inserting detail:', detail);
          await conn.execute(
            'INSERT INTO fahrt_details (fahrt_id, von_ort_id, nach_ort_id, kilometer, abrechnung) VALUES (?, ?, ?, ?, ?)',
            [fahrtId, detail.vonOrtId, detail.nachOrtId, detail.kilometer, detail.abrechnung]
          );
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
      manuelleKilometer,
      abrechnung,
      autosplit,
      datum
    } = updateData;
    
    if (id === null || anlass === null || datum === null) {
      throw new Error('Ungültige Parameter für update');
    }
    
    const [result] = await db.execute(
      `UPDATE fahrten SET 
      von_ort_id = ?, 
      nach_ort_id = ?, 
      einmaliger_von_ort = ?,
      einmaliger_nach_ort = ?,
      anlass = ?, 
      kilometer = ?, 
      manuelle_kilometer = ?, 
      abrechnung = ?, 
      autosplit = ?, 
      datum = ? 
    WHERE id = ? AND user_id = ?`,
      [
        vonOrtId || null, 
        nachOrtId || null, 
        einmaligerVonOrt || null,
        einmaligerNachOrt || null,
        anlass, 
        kilometer, 
        manuelleKilometer, 
        abrechnung, 
        autosplit ? 1 : 0, 
        datum, 
        id, 
        userId
      ]
    );
    return result.affectedRows > 0;
  }

  static async updateFahrtenByDistanz(vonOrtId, nachOrtId, neueDistanz) {
    const [result] = await db.execute(
      `UPDATE fahrten 
      SET kilometer = ? 
      WHERE (von_ort_id = ? AND nach_ort_id = ?) OR (von_ort_id = ? AND nach_ort_id = ?)`,
      [neueDistanz, vonOrtId, nachOrtId, nachOrtId, vonOrtId]
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

  static async getMonthlySummary() {
    try {
      const [rows] = await db.execute(`
      SELECT 
        DATE_FORMAT(datum, '%Y-%m') as yearMonth,
        SUM(CASE 
          WHEN abrechnung = 'Kirchenkreis' OR autosplit = 1 THEN kirchenkreis_km * 0.3 
          ELSE 0 
        END) as kirchenkreisErstattung,
        SUM(CASE 
          WHEN abrechnung = 'Gemeinde' OR autosplit = 1 THEN gemeinde_km * 0.3 
          ELSE 0 
        END) as gemeindeErstattung
      FROM fahrten
      LEFT JOIN fahrt_details ON fahrten.id = fahrt_details.fahrt_id
      GROUP BY yearMonth
      ORDER BY yearMonth DESC
    `);
      return rows;
    } catch (error) {
      console.error('Fehler beim Abrufen der monatlichen Zusammenfassung:', error);
      throw error;
    }
  }


  static async getMonthlyReport(year, month, userId) {
    try {
      console.log(`Fetching monthly report for year ${year}, month ${month}, userId ${userId}`);
      
      // Hauptabfrage für Fahrten
      const [fahrtRows] = await db.execute(`
      SELECT f.*, 
              COALESCE(v.name, f.einmaliger_von_ort) AS von_ort_name, 
              COALESCE(v.adresse, f.einmaliger_von_ort) AS von_ort_adresse, 
              COALESCE(n.name, f.einmaliger_nach_ort) AS nach_ort_name, 
              COALESCE(n.adresse, f.einmaliger_nach_ort) AS nach_ort_adresse
      FROM fahrten f
      LEFT JOIN orte v ON f.von_ort_id = v.id
      LEFT JOIN orte n ON f.nach_ort_id = n.id
      WHERE YEAR(f.datum) = ? AND MONTH(f.datum) = ? AND f.user_id = ?
      ORDER BY f.datum, f.id
    `, [year, month, userId]);
      
      console.log(`Retrieved ${fahrtRows.length} main fahrt rows`);
      
      if (fahrtRows.length === 0) {
        console.log('No fahrten found for the given month');
        return [];
      }
      
      const fahrtIds = fahrtRows.map(row => row.id);
      
      // Abfrage für Fahrtdetails
      const [detailRows] = await db.execute(`
      SELECT fd.*, 
              v.name AS von_ort_name, v.adresse AS von_ort_adresse,
              n.name AS nach_ort_name, n.adresse AS nach_ort_adresse
      FROM fahrt_details fd
      LEFT JOIN orte v ON fd.von_ort_id = v.id
      LEFT JOIN orte n ON fd.nach_ort_id = n.id
      WHERE fd.fahrt_id IN (?)
    `, [fahrtIds]);
      
      console.log(`Retrieved ${detailRows.length} detail rows`);
      
      // Abfrage für Mitfahrer
      const [mitfahrerRows] = await db.execute(`
      SELECT m.*
      FROM mitfahrer m
      WHERE m.fahrt_id IN (?)
    `, [fahrtIds]);
      
      console.log(`Retrieved ${mitfahrerRows.length} mitfahrer rows`);
      
      // Zusammenführen der Daten
      const groupedFahrten = fahrtRows.map(fahrt => {
        const details = detailRows.filter(detail => detail.fahrt_id === fahrt.id);
        const mitfahrer = mitfahrerRows.filter(mitfahrer => mitfahrer.fahrt_id === fahrt.id);
        return {
          ...fahrt,
          details,
          mitfahrer
        };
      });
      
      console.log(`Grouped ${groupedFahrten.length} fahrten`);
      if (groupedFahrten.length > 0) {
        console.log('Sample fahrt:', JSON.stringify(groupedFahrten[0], null, 2));
      }
      
      return groupedFahrten;
    } catch (error) {
      console.error('Fehler beim Abrufen des Monatsberichts:', error);
      throw error;
    }
  }
  
  static async getYearSummary(year, userId) {
    try {
      const [rows] = await db.execute(`
    SELECT 
      SUM(CASE 
        WHEN f.abrechnung = 'Kirchenkreis' THEN f.kilometer * 0.3
        WHEN f.autosplit = 1 THEN (SELECT SUM(fd.kilometer * 0.3) FROM fahrt_details fd WHERE fd.fahrt_id = f.id AND fd.abrechnung = 'Kirchenkreis')
        ELSE 0 
      END) as kirchenkreis,
      SUM(CASE 
        WHEN f.abrechnung = 'Gemeinde' THEN f.kilometer * 0.3
        WHEN f.autosplit = 1 THEN (SELECT SUM(fd.kilometer * 0.3) FROM fahrt_details fd WHERE fd.fahrt_id = f.id AND fd.abrechnung = 'Gemeinde')
        ELSE 0 
      END) as gemeinde
    FROM fahrten f
    WHERE YEAR(f.datum) = ? AND f.user_id = ?
  `, [year, userId]);
      return rows[0];
    } catch (error) {
      console.error('Fehler beim Abrufen der Jahreszusammenfassung:', error);
      throw error;
    }
  }
}

module.exports = Fahrt;