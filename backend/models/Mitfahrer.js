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
}

module.exports = Mitfahrer;