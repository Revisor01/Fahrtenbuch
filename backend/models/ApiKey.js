const db = require('../config/database');
const crypto = require('crypto');

// SHA-256 genügt bei 256 Bit Entropie und erlaubt den indizierten Vergleich.
function hashe(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}

class ApiKey {
    static async generate(userId, description = 'API Key für Kurzbefehle') {
        const key = crypto.randomBytes(32).toString('hex');
        // Nur der Hash geht in die Datenbank, der Klartext einmal an die Nutzer:in.
        const [result] = await db.execute(
            'INSERT INTO api_keys (user_id, api_key_hash, description) VALUES (?, ?, ?)',
            [userId, hashe(key), description]
        );
        return { id: result.insertId, key };
    }
    
    static async validate(key) {
        // Rückfall auf die Klartextspalte für die Zeit zwischen Deploy und Migration 0015.
        const [rows] = await db.execute(
            `SELECT 
            ak.id as api_key_id,
            ak.user_id,
            ak.description,
            ak.created_at,
            ak.last_used_at,
            ak.is_active,
            u.* 
        FROM api_keys ak 
        JOIN users u ON ak.user_id = u.id 
        WHERE (ak.api_key_hash = ? OR (ak.api_key_hash IS NULL AND ak.api_key = ?))
          AND ak.is_active = 1`,
            [hashe(key), key]
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
    
    static async updateLastUsed(id) {
        await db.execute(
            'UPDATE api_keys SET last_used_at = NOW() WHERE id = ?',
            [id]
        );
    }

    static async delete(id, userId) {
        const [result] = await db.execute(
            'DELETE FROM api_keys WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        return result.affectedRows > 0;
    }
}

module.exports = ApiKey;