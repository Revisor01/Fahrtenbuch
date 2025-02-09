const db = require('../config/database');

class Distanz {
  static async createOrUpdate(vonOrtId, nachOrtId, distanz, userId) {
    try {
      vonOrtId = vonOrtId || null;
      nachOrtId = nachOrtId || null;
      distanz = distanz || null;

      if (vonOrtId === null || nachOrtId === null || distanz === null) {
        throw new Error('Ungültige Parameter für createOrUpdate');
      }

      const [existingDistanz] = await db.execute(
        'SELECT * FROM distanzen WHERE (von_ort_id = ? AND nach_ort_id = ?) OR (von_ort_id = ? AND nach_ort_id = ?)',
        [vonOrtId, nachOrtId, nachOrtId, vonOrtId]
      );

      if (existingDistanz.length > 0) {
        await db.execute(
          'UPDATE distanzen SET distanz = ? WHERE ((von_ort_id = ? AND nach_ort_id = ?) OR (von_ort_id = ? AND nach_ort_id = ?)) AND user_id = ?',
          [distanz, vonOrtId, nachOrtId, nachOrtId, vonOrtId, userId]
        );
        return existingDistanz[0].id;
      } else {
        const [result] = await db.execute(
          'INSERT INTO distanzen (von_ort_id, nach_ort_id, distanz, user_id) VALUES (?, ?, ?, ?)',
          [vonOrtId, nachOrtId, distanz, userId]
        );
        return result.insertId;
      }
    } catch (error) {
      console.error('Fehler in Distanz.createOrUpdate:', error);
      throw error;
    }
  }

  static async delete(id, userId) {
    try {
      const [result] = await db.execute('DELETE FROM distanzen WHERE id = ? AND user_id = ?', [id, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Fehler beim Löschen der Distanz:', error);
      throw error;
    }
  }
  
  static async update(id, vonOrtId, nachOrtId, distanz, userId) {
    const [result] = await db.execute(
      'UPDATE distanzen SET von_ort_id = ?, nach_ort_id = ?, distanz = ? WHERE id = ? AND user_id = ?',
      [vonOrtId, nachOrtId, distanz, id, userId]
    );
    return result.affectedRows > 0;
  }
  
  static async getDistance(vonOrtId, nachOrtId, userId) {
    try {
      vonOrtId = vonOrtId || null;
      nachOrtId = nachOrtId || null;

      if (vonOrtId === null || nachOrtId === null) {
        throw new Error('Ungültige Parameter für getDistance');
      }

      const [rows] = await db.execute(
        'SELECT distanz FROM distanzen WHERE ((von_ort_id = ? AND nach_ort_id = ?) OR (von_ort_id = ? AND nach_ort_id = ?)) AND user_id = ?',
        [vonOrtId, nachOrtId, nachOrtId, vonOrtId, userId]
      );
      if (rows.length > 0) {
        return rows[0].distanz;
      }
      return null;
    } catch (error) {
      console.error('Fehler in Distanz.getDistance:', error);
      throw error;
    }
  }

  static async findAll(userId) {
    try {
      const [rows] = await db.query('SELECT * FROM distanzen WHERE user_id = ?', [userId]);
      return rows;
    } catch (error) {
      console.error('Fehler in Distanz.findAll:', error);
      throw error;
    }
  }
}

module.exports = Distanz;