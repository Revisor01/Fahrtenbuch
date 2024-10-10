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
      
      const [rows] = await db.execute(`
      SELECT f.*, 
              COALESCE(v.name, f.einmaliger_von_ort) AS von_ort_name, 
              COALESCE(v.adresse, f.einmaliger_von_ort) AS von_ort_adresse, 
              COALESCE(n.name, f.einmaliger_nach_ort) AS nach_ort_name, 
              COALESCE(n.adresse, f.einmaliger_nach_ort) AS nach_ort_adresse,
              fd.id AS detail_id, fd.von_ort_id AS detail_von_ort_id, fd.nach_ort_id AS detail_nach_ort_id, 
              fd.kilometer AS detail_kilometer, fd.abrechnung AS detail_abrechnung,
              vd.name AS detail_von_ort_name, vd.adresse AS detail_von_ort_adresse,
              nd.name AS detail_nach_ort_name, nd.adresse AS detail_nach_ort_adresse
      FROM fahrten f
      LEFT JOIN orte v ON f.von_ort_id = v.id
      LEFT JOIN orte n ON f.nach_ort_id = n.id
      LEFT JOIN fahrt_details fd ON f.id = fd.fahrt_id
      LEFT JOIN orte vd ON fd.von_ort_id = vd.id
      LEFT JOIN orte nd ON fd.nach_ort_id = nd.id
      WHERE YEAR(f.datum) = ? AND MONTH(f.datum) = ? AND f.user_id = ?
      ORDER BY f.datum, f.id, fd.id
    `, [year, month, userId]);
      
      console.log(`Retrieved ${rows.length} rows from database`);
      
      const groupedFahrten = rows.reduce((acc, row) => {
        if (!acc[row.id]) {
          acc[row.id] = {
            ...row,
            details: []
          };
          delete acc[row.id].detail_id;
          delete acc[row.id].detail_von_ort_id;
          delete acc[row.id].detail_nach_ort_id;
          delete acc[row.id].detail_kilometer;
          delete acc[row.id].detail_abrechnung;
          delete acc[row.id].detail_von_ort_name;
          delete acc[row.id].detail_von_ort_adresse;
          delete acc[row.id].detail_nach_ort_name;
          delete acc[row.id].detail_nach_ort_adresse;
        }
        if (row.detail_id) {
          acc[row.id].details.push({
            id: row.detail_id,
            von_ort_id: row.detail_von_ort_id,
            nach_ort_id: row.detail_nach_ort_id,
            von_ort_name: row.detail_von_ort_name,
            von_ort_adresse: row.detail_von_ort_adresse,
            nach_ort_name: row.detail_nach_ort_name,
            nach_ort_adresse: row.detail_nach_ort_adresse,
            kilometer: row.detail_kilometer,
            abrechnung: row.detail_abrechnung
          });
        }
        return acc;
      }, {});
      
      // Fetch Mitfahrer data
      const fahrtIds = Object.keys(groupedFahrten);
      const [mitfahrerRows] = await db.execute(`
      SELECT * FROM mitfahrer WHERE fahrt_id IN (?)
    `, [fahrtIds]);
      
      console.log(`Retrieved ${mitfahrerRows.length} mitfahrer rows`);
      
      // Add Mitfahrer to their respective Fahrten
      mitfahrerRows.forEach(mitfahrer => {
        if (groupedFahrten[mitfahrer.fahrt_id]) {
          if (!groupedFahrten[mitfahrer.fahrt_id].mitfahrer) {
            groupedFahrten[mitfahrer.fahrt_id].mitfahrer = [];
          }
          groupedFahrten[mitfahrer.fahrt_id].mitfahrer.push(mitfahrer);
        }
      });
      
      const result = Object.values(groupedFahrten);
      console.log(`Returning ${result.length} grouped fahrten`);
      return result;
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