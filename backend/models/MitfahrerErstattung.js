const db = require('../config/database');

class MitfahrerErstattung {
    static async getCurrentBetrag(userId) {
        const [rows] = await db.execute(`
            SELECT betrag, gueltig_ab 
            FROM mitfahrer_erstattung 
            WHERE user_id = ? 
            AND gueltig_ab <= CURRENT_DATE()
            ORDER BY gueltig_ab DESC 
            LIMIT 1`,
            [userId]
        );
        return rows[0];
    }

    static async getHistorie(userId) {
        const [rows] = await db.execute(
            'SELECT betrag, gueltig_ab, created_at FROM mitfahrer_erstattung WHERE user_id = ? ORDER BY gueltig_ab DESC',
            [userId]
        );
        return rows;
    }

    static async setBetrag(userId, betrag, gueltig_ab = null) {
        const datum = gueltig_ab || new Date().toISOString().split('T')[0];
        const [result] = await db.execute(
            'INSERT INTO mitfahrer_erstattung (user_id, betrag, gueltig_ab) VALUES (?, ?, ?)',
            [userId, betrag, datum]
        );
        return result.insertId;
    }
}

module.exports = MitfahrerErstattung;