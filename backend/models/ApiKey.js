const db = require('../config/database');
const crypto = require('crypto');

class ApiKey {
    static async generate(userId, description = 'API Key für Kurzbefehle') {
        const key = crypto.randomBytes(32).toString('hex');
        const [result] = await db.execute(
            'INSERT INTO api_keys (user_id, api_key, description) VALUES (?, ?, ?)',
            [userId, key, description]
        );
        return { id: result.insertId, key };
    }

    static async validate(key) {
        const [rows] = await db.execute(
            `SELECT ak.*, u.* FROM api_keys ak 
             JOIN users u ON ak.user_id = u.id 
             WHERE ak.api_key = ? AND ak.is_active = 1`,
            [key]
        );
        return rows[0];
    }

    static async listForUser(userId) {
        const [rows] = await db.execute(
            'SELECT id, description, created_at, last_used_at, is_active FROM api_keys WHERE user_id = ?',
            [userId]
        );
        return rows;
    }

    static async revoke(id, userId) {
        const [result] = await db.execute(
            'UPDATE api_keys SET is_active = 0 WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        return result.affectedRows > 0;
    }

    static async updateLastUsed(id) {
        await db.execute(
            'UPDATE api_keys SET last_used_at = NOW() WHERE id = ?',
            [id]
        );
    }
}

module.exports = ApiKey;