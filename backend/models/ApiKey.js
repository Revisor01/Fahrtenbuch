const db = require('../config/database');
const crypto = require('crypto');

// Der Schluessel hat 256 Bit Entropie (randomBytes(32)) — da gibt es nichts
// zu raten, und SHA-256 genuegt. Ein langsames Verfahren wie bcrypt brauchte
// es nur gegen Woerterbuchangriffe, wuerde hier aber jede Anfrage bremsen und
// den indizierten Gleichheitsvergleich unmoeglich machen.
function hashe(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}

class ApiKey {
    static async generate(userId, description = 'API Key für Kurzbefehle') {
        const key = crypto.randomBytes(32).toString('hex');
        // Nur der Hash geht in die Datenbank. Der Klartext verlaesst diese
        // Funktion einmal — der Controller gibt ihn der Nutzer:in, danach ist
        // er nirgends mehr abrufbar. Ein Datenbank-Backup enthaelt damit
        // keine nutzbaren Dauer-Zugaenge mehr.
        const [result] = await db.execute(
            'INSERT INTO api_keys (user_id, api_key_hash, description) VALUES (?, ?, ?)',
            [userId, hashe(key), description]
        );
        return { id: result.insertId, key };
    }
    
    static async validate(key) {
        // Der Rueckfall auf die Klartextspalte deckt den Moment zwischen dem
        // Deploy und dem Durchlauf der Migration 0015 ab: Startet der neue
        // Code, bevor die Spalte gefuellt ist, fuenden bestehende Kurzbefehle
        // sonst ihren Schluessel nicht mehr. Nach der Migration steht dort
        // ueberall NULL, und der zweite Vergleich trifft nie.
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