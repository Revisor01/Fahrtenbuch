const db = require('../config/database');

class Mitfahrer {
  static async create(fahrtId, name, arbeitsstaette, richtung) {
    const [result] = await db.execute(
      'INSERT INTO mitfahrer (fahrt_id, name, arbeitsstaette, richtung) VALUES (?, ?, ?, ?)',
      [fahrtId, name, arbeitsstaette, richtung]
    );
    return result.insertId;
  }

  static async findByFahrtId(fahrtId) {
    const [rows] = await db.execute(
      'SELECT * FROM mitfahrer WHERE fahrt_id = ?',
      [fahrtId]
    );
    return rows;
  }

  static async update(id, name, arbeitsstaette, richtung) {
    const [result] = await db.execute(
      'UPDATE mitfahrer SET name = ?, arbeitsstaette = ?, richtung = ? WHERE id = ?',
      [name, arbeitsstaette, richtung, id]
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await db.execute('DELETE FROM mitfahrer WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async deleteByFahrtId(fahrtId) {
    const [result] = await db.execute(
      'DELETE FROM mitfahrer WHERE fahrt_id = ?', 
      [fahrtId]
    );
    return result.affectedRows > 0;
  }
  static async updateMitfahrerForFahrt(fahrtId, neueMitfahrer) {
    try {
      // 1. Aktuelle Mitfahrer abrufen
      const [aktuelle] = await db.execute(
        'SELECT * FROM mitfahrer WHERE fahrt_id = ?',
        [fahrtId]
      );
      
      // 2. Zu löschende Mitfahrer identifizieren
      const zuLoeschen = aktuelle.filter(alt => 
        !neueMitfahrer.some(neu => 
          neu.id === alt.id && 
          neu.name === alt.name && 
          neu.arbeitsstaette === alt.arbeitsstaette && 
          neu.richtung === alt.richtung
        )
      );
      
      // 3. Neue Mitfahrer identifizieren 
      const zuErstellen = neueMitfahrer.filter(neu => !neu.id);
      
      // 4. Zu aktualisierende Mitfahrer
      const zuAktualisieren = neueMitfahrer.filter(neu => neu.id);
      
      // 5. Änderungen durchführen
      await Promise.all([
        // Löschungen
        ...zuLoeschen.map(m => 
          db.execute('DELETE FROM mitfahrer WHERE id = ?', [m.id])
        ),
        // Updates  
        ...zuAktualisieren.map(m =>
          db.execute(
            'UPDATE mitfahrer SET name = ?, arbeitsstaette = ?, richtung = ? WHERE id = ?',
            [m.name, m.arbeitsstaette, m.richtung, m.id]
          )
        ),
        // Neue Einträge
        ...zuErstellen.map(m =>
          db.execute(
            'INSERT INTO mitfahrer (fahrt_id, name, arbeitsstaette, richtung) VALUES (?, ?, ?, ?)',
            [fahrtId, m.name, m.arbeitsstaette, m.richtung]
          )
        )
      ]);
      
      return true;
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Mitfahrer:', error);
      throw error;
    }
  }
}

module.exports = Mitfahrer;