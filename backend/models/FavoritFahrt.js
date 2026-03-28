const db = require('../config/database');

class FavoritFahrt {
  static async findAll(userId) {
    const [rows] = await db.query(`
      SELECT
        ff.*,
        v.name AS von_ort_name,
        n.name AS nach_ort_name,
        at.name AS traeger_name
      FROM favoriten_fahrten ff
      LEFT JOIN orte v ON ff.von_ort_id = v.id
      LEFT JOIN orte n ON ff.nach_ort_id = n.id
      LEFT JOIN abrechnungstraeger at ON ff.abrechnungstraeger_id = at.id
      WHERE ff.user_id = ?
      ORDER BY ff.sort_order ASC, ff.created_at DESC
    `, [userId]);
    return rows;
  }

  static async findById(id, userId) {
    const [rows] = await db.execute(`
      SELECT
        ff.*,
        v.name AS von_ort_name,
        n.name AS nach_ort_name,
        at.name AS traeger_name
      FROM favoriten_fahrten ff
      LEFT JOIN orte v ON ff.von_ort_id = v.id
      LEFT JOIN orte n ON ff.nach_ort_id = n.id
      LEFT JOIN abrechnungstraeger at ON ff.abrechnungstraeger_id = at.id
      WHERE ff.id = ? AND ff.user_id = ?
    `, [id, userId]);
    return rows[0];
  }

  static async create(data, userId) {
    const { vonOrtId, nachOrtId, anlass, abrechnungstraegerId, sortOrder = 0 } = data;
    const [result] = await db.execute(
      `INSERT INTO favoriten_fahrten (user_id, von_ort_id, nach_ort_id, anlass, abrechnungstraeger_id, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, vonOrtId, nachOrtId, anlass, abrechnungstraegerId, sortOrder]
    );
    return result.insertId;
  }

  static async delete(id, userId) {
    const [result] = await db.execute(
      'DELETE FROM favoriten_fahrten WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.affectedRows > 0;
  }

  static async updateSortOrder(id, sortOrder, userId) {
    const [result] = await db.execute(
      'UPDATE favoriten_fahrten SET sort_order = ? WHERE id = ? AND user_id = ?',
      [sortOrder, id, userId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = FavoritFahrt;
