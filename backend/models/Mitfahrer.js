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

  static async update(id, fahrtId, name, arbeitsstaette, richtung) {
    const [result] = await db.execute(
      'UPDATE mitfahrer SET name = ?, arbeitsstaette = ?, richtung = ? WHERE id = ? AND fahrt_id = ?',
      [name, arbeitsstaette, richtung, id, fahrtId]
    );
    return result.affectedRows > 0;
  }

  static async delete(id, fahrtId) {
    const [result] = await db.execute(
      'DELETE FROM mitfahrer WHERE id = ? AND fahrt_id = ?',
      [id, fahrtId]
    );
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
    // Alles in einer Transaktion: bisher liefen Loeschen, Aktualisieren und
    // Anlegen parallel auf dem Pool - ein Fehler mittendrin hinterliess einen
    // Teilzustand (alte weg, neue fehlen).
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Aktuelle Mitfahrer abrufen
      const [aktuelle] = await connection.execute(
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
      
      // 4. Zu aktualisierende Mitfahrer — nur IDs, die zu dieser Fahrt gehören
      // (fremde/unbekannte IDs werden stillschweigend ignoriert)
      const zuAktualisieren = neueMitfahrer.filter(neu =>
        neu.id && aktuelle.some(alt => alt.id === neu.id)
      );

      // 5. Änderungen durchführen — nacheinander auf derselben Verbindung,
      // damit die Transaktion greift
      for (const m of zuLoeschen) {
        await connection.execute('DELETE FROM mitfahrer WHERE id = ?', [m.id]);
      }
      // Updates (defensiv zusätzlich per fahrt_id gescopt)
      for (const m of zuAktualisieren) {
        await connection.execute(
          'UPDATE mitfahrer SET name = ?, arbeitsstaette = ?, richtung = ? WHERE id = ? AND fahrt_id = ?',
          [m.name, m.arbeitsstaette, m.richtung, m.id, fahrtId]
        );
      }
      for (const m of zuErstellen) {
        await connection.execute(
          'INSERT INTO mitfahrer (fahrt_id, name, arbeitsstaette, richtung) VALUES (?, ?, ?, ?)',
          [fahrtId, m.name, m.arbeitsstaette, m.richtung]
        );
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('Fehler beim Aktualisieren der Mitfahrer:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = Mitfahrer;