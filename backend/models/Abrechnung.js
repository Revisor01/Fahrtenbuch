const db = require('../config/database');

class Abrechnung {
    static async getStatus(userId, jahr, monat) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM abrechnungen WHERE user_id = ? AND jahr = ? AND monat = ?',
                [userId, jahr, monat]
            );
            return rows;
        } catch (error) {
            console.error('Fehler beim Abrufen des Abrechnungsstatus:', error);
            throw error;
        }
    }

    static async updateStatus(userId, jahr, monat, typ, aktion, datum) {
        try {
            if (aktion === 'eingereicht') {
                const [result] = await db.execute(
                    `INSERT INTO abrechnungen (user_id, jahr, monat, typ, eingereicht_am)
                     VALUES (?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE eingereicht_am = ?`,
                    [userId, jahr, monat, typ, datum, datum]
                );
                return result;
            } else if (aktion === 'erhalten') {
                const [result] = await db.execute(
                    `UPDATE abrechnungen 
                     SET erhalten_am = ?
                     WHERE user_id = ? AND jahr = ? AND monat = ? AND typ = ?`,
                    [datum, userId, jahr, monat, typ]
                );
                return result;
            } else if (aktion === 'reset') {
                const [result] = await db.execute(
                    `DELETE FROM abrechnungen 
                     WHERE user_id = ? AND jahr = ? AND monat = ? AND typ = ?`,
                    [userId, jahr, monat, typ]
                );
                return result;
            }
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Status:', error);
            throw error;
        }
    }

    static async getAllStatusForYear(userId, jahr) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM abrechnungen WHERE user_id = ? AND jahr = ?',
                [userId, jahr]
            );
            return rows;
        } catch (error) {
            console.error('Fehler beim Abrufen der Jahres-Status:', error);
            throw error;
        }
    }
}

module.exports = Abrechnung;