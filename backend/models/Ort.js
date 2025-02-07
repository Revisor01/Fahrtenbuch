const db = require('../config/database');

class Ort {
  static async create(name, adresse, istWohnort, istDienstort, istKirchspiel, userId) {
    try {
      name = name || null;
      adresse = adresse || null;
      istWohnort = istWohnort || false;
      istDienstort = istDienstort || false;
      istKirchspiel = istKirchspiel || false;

      if (name === null || adresse === null) {
        throw new Error('Ungültige Parameter für create');
      }

      const [result] = await db.execute(
        'INSERT INTO orte (name, adresse, ist_wohnort, ist_dienstort, ist_kirchspiel, user_id) VALUES (?, ?, ?, ?, ?, ?)',
        [name, adresse, istWohnort ? 1 : 0, istDienstort ? 1 : 0, istKirchspiel ? 1 : 0, userId]
      );
      return result.insertId;
    } catch (error) {
      console.error('Fehler in Ort.create:', error);
      throw error;
    }
  }

  static async findAll(userId) {
    try {
      const [rows] = await db.query('SELECT * FROM orte WHERE user_id = ?', [userId]);
      return rows;
    } catch (error) {
      console.error('Fehler in Ort.findAll:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      if (id === undefined || id === null) {
        throw new Error('Ungültige ID für findById');
      }
      const [rows] = await db.execute('SELECT * FROM orte WHERE id = ?', [id]);
      return rows[0];
    } catch (error) {
      console.error('Fehler in Ort.findById:', error);
      throw error;
    }
  }

  static async update(id, name, adresse, istWohnort, istDienstort, istKirchspiel, userId) {
    
    const [result] = await db.execute(
      'UPDATE orte SET name = ?, adresse = ?, ist_wohnort = ?, ist_dienstort = ?, ist_kirchspiel = ? WHERE id = ? AND user_id = ?',
      [name, adresse, istWohnort ? 1 : 0, istDienstort ? 1 : 0, istKirchspiel ? 1 : 0, id, userId]
    );
    
    return result.affectedRows > 0;
  }


  static async isUsedInFahrten(id) {
    try {
      const [rows] = await db.execute('SELECT COUNT(*) as count FROM fahrten WHERE von_ort_id = ? OR nach_ort_id = ?', [id, id]);
      return rows[0].count > 0;
    } catch (error) {
      console.error('Fehler beim Überprüfen der Ort-Verwendung:', error);
      throw error;
    }
  }
  
  static async delete(id, userId) {
    try {
      const [result] = await db.execute('DELETE FROM orte WHERE id = ? AND user_id = ?', [id, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Fehler beim Löschen des Ortes:', error);
      throw error;
    }
  }
}

module.exports = Ort;