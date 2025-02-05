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
        abrechnung,
        SUM(kilometer) as kilometer,
        COUNT(DISTINCT m.id) as mitfahrer_count
      FROM fahrten f
      LEFT JOIN mitfahrer m ON f.id = m.fahrt_id
      GROUP BY yearMonth, abrechnung
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
      console.log("Executing query:", query, [year, month, userId]);
      const [rows] = await db.execute(query, [year, month, userId]);
      console.log("Query results:", rows);
      
      return rows;
    } catch (error) {
      console.error("DB Error:", error);
      throw error;
    }
  }
  
  
  static async getYearSummary(year, userId) {
    try {
      // Hole alle Fahrten des Jahres mit Mitfahrer-Count
      const [fahrtenRows] = await db.execute(`
      SELECT 
        f.datum,
        f.kilometer,
        f.abrechnung,
        COUNT(m.id) as mitfahrer_count
      FROM fahrten f
      LEFT JOIN mitfahrer m ON f.id = m.fahrt_id
      WHERE YEAR(f.datum) = ? AND f.user_id = ?
      GROUP BY f.id, f.datum, f.kilometer, f.abrechnung
    `, [year, userId]);
      
      // Hole die Erstattungssätze
      const [erstattungssaetze] = await db.execute(`
      SELECT 
        eb.betrag,
        eb.gueltig_ab
      FROM abrechnungstraeger at
      INNER JOIN erstattungsbetraege eb ON eb.abrechnungstraeger_id = at.id
      WHERE at.user_id = ? 
        AND at.active = true
        AND eb.gueltig_ab <= LAST_DAY(?)
      ORDER BY eb.gueltig_ab DESC
    `, [userId, `${year}-12-31`]);
      
      // Gruppiere die Sätze nach Kennzeichen
      const saetzeProTraeger = {};
      erstattungssaetze.forEach(satz => {
        if (!saetzeProTraeger[satz.kennzeichen]) {
          saetzeProTraeger[satz.kennzeichen] = [];
        }
        saetzeProTraeger[satz.kennzeichen].push(satz);
      });
      
      // Hilfsfunktion zum Finden des korrekten Erstattungssatzes
      const getErstattungssatz = (kennzeichen, datum) => {
        if (!saetzeProTraeger[kennzeichen]) return 0;
        
        const saetze = saetzeProTraeger[kennzeichen];
        const passenderSatz = saetze.find(satz => 
          new Date(satz.gueltig_ab) <= new Date(datum)
        );
        
        return passenderSatz ? passenderSatz.betrag : 0;
      };
      
      // Verarbeite die Fahrten
      const summary = fahrtenRows.reduce((acc, fahrt) => {
        const erstattungssatz = getErstattungssatz(fahrt.abrechnung, fahrt.datum);
        const erstattung = fahrt.kilometer * erstattungssatz;
        
        if (!acc[fahrt.abrechnung]) {
          acc[fahrt.abrechnung] = {
            kilometer: 0,
            erstattung: 0
          };
        }
        
        acc[fahrt.abrechnung].kilometer += fahrt.kilometer;
        acc[fahrt.abrechnung].erstattung += erstattung;
        
        if (fahrt.mitfahrer_count > 0) {
          const mitfahrerSatz = getErstattungssatz('mitfahrer', fahrt.datum);
          const mitfahrerErstattung = fahrt.mitfahrer_count * mitfahrerSatz * fahrt.kilometer;
          
          if (!acc.mitfahrer) {
            acc.mitfahrer = {
              kilometer: 0,
              erstattung: 0
            };
          }
          acc.mitfahrer.erstattung += mitfahrerErstattung;
          acc.mitfahrer.kilometer += fahrt.kilometer;
        }
        
        return acc;
      }, {});
      
      return summary;
    } catch (error) {
      console.error('Fehler beim Abrufen der Jahreszusammenfassung:', error);
      throw error;
    }
  }
}

module.exports = Fahrt;