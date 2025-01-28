const db = require('../config/database');
const crypto = require('crypto');

class ApiKey {
    static async generate(userId, description) {
        const key = crypto.randomBytes(32).toString('hex');
        const [result] = await db.execute(
            'INSERT INTO api_keys (user_id, api_key, description, is_active) VALUES (?, ?, ?, 1)',
            [userId, key, description]
        );
        return { key }; // nur einmal den ungehashten Key zurückgeben
    }

    static async listForUser(userId) {
        const [rows] = await db.execute(`
            SELECT id, description, created_at, last_used_at, is_active 
            FROM api_keys 
            WHERE user_id = ? 
            ORDER BY created_at DESC`,
            [userId]
        );
        return rows;
    }

    static async validate(apiKey) {
        const [rows] = await db.execute(
            'SELECT user_id, id FROM api_keys WHERE api_key = ? AND is_active = 1',
            [apiKey]
        );
        if (rows.length === 0) return null;
        
        // Update last_used_at
        await db.execute(
            'UPDATE api_keys SET last_used_at = NOW() WHERE id = ?',
            [rows[0].id]
        );
        
        return rows[0];
    }

    static async revoke(id, userId) {
        const [result] = await db.execute(
            'UPDATE api_keys SET is_active = 0 WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        return result.affectedRows > 0;
    }

    static async permanentlyDelete(id, userId) {
        const [result] = await db.execute(
            'DELETE FROM api_keys WHERE id = ? AND user_id = ? AND is_active = 0',
            [id, userId]
        );
        return result.affectedRows > 0;
    }
}

module.exports = ApiKey;