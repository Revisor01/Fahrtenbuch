const db = require('../config/database');

class AbrechnungsTraeger {
    static async findAllForUser(userId) {
        try {
            const [rows] = await db.execute(`
                SELECT 
                    at.*,
                    eb.betrag as aktueller_betrag,
                    eb.gueltig_ab as betrag_gueltig_ab
                FROM abrechnungstraeger at
                LEFT JOIN (
                    SELECT abrechnungstraeger_id, betrag, gueltig_ab
                    FROM erstattungsbetraege eb1
                    WHERE gueltig_ab = (
                        SELECT MAX(gueltig_ab)
                        FROM erstattungsbetraege eb2
                        WHERE eb2.abrechnungstraeger_id = eb1.abrechnungstraeger_id
                        AND eb2.gueltig_ab <= CURRENT_DATE()
                    )
                ) eb ON at.id = eb.abrechnungstraeger_id
                WHERE at.user_id = ?
                ORDER BY at.sort_order ASC`,
                [userId]
            );
            return rows;
        } catch (error) {
            console.error('Fehler in findAllForUser:', error);
            throw error;
        }
    }

    static async findById(id, userId) {
        try {
            const [rows] = await db.execute(`
                SELECT 
                    at.*,
                    eb.betrag as aktueller_betrag,
                    eb.gueltig_ab as betrag_gueltig_ab
                FROM abrechnungstraeger at
                LEFT JOIN (
                    SELECT abrechnungstraeger_id, betrag, gueltig_ab
                    FROM erstattungsbetraege eb1
                    WHERE gueltig_ab = (
                        SELECT MAX(gueltig_ab)
                        FROM erstattungsbetraege eb2
                        WHERE eb2.abrechnungstraeger_id = eb1.abrechnungstraeger_id
                        AND eb2.gueltig_ab <= CURRENT_DATE()
                    )
                ) eb ON at.id = eb.abrechnungstraeger_id
                WHERE at.id = ? AND at.user_id = ?`,
                [id, userId]
            );
            return rows[0];
        } catch (error) {
            console.error('Fehler in findById:', error);
            throw error;
        }
    }

    static async create(userData) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            const [result] = await connection.execute(
                'INSERT INTO abrechnungstraeger (user_id, name, kennzeichen) VALUES (?, ?, ?)',
                [userData.userId, userData.name, userData.kennzeichen]
            );
            
            const abrechnungsTraegerId = result.insertId;
            
            // Setze Standardwert von 0.30€ ab 1.1.2024
            await connection.execute(
                'INSERT INTO erstattungsbetraege (abrechnungstraeger_id, betrag, gueltig_ab) VALUES (?, 0.30, "2024-01-01")',
                [abrechnungsTraegerId]
            );
            
            await connection.commit();
            return abrechnungsTraegerId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async update(id, userId, updateData) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Update Basisdaten
            await connection.execute(
                'UPDATE abrechnungstraeger SET name = ?, active = ? WHERE id = ? AND user_id = ?',
                [updateData.name, updateData.active, id, userId]
            );

            // Wenn ein neuer Erstattungsbetrag angegeben wurde
            if (updateData.betrag !== undefined) {
                await connection.execute(
                    'INSERT INTO erstattungsbetraege (abrechnungstraeger_id, betrag, gueltig_ab) VALUES (?, ?, ?)',
                    [id, updateData.betrag, updateData.gueltig_ab || new Date().toISOString().split('T')[0]]
                );
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async updateSortOrder(userId, sortOrderUpdates) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            for (const update of sortOrderUpdates) {
                await connection.execute(
                    'UPDATE abrechnungstraeger SET sort_order = ? WHERE id = ? AND user_id = ?',
                    [update.sort_order, update.id, userId]
                );
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async checkForFahrten(id) {
        const [rows] = await db.execute(
            'SELECT COUNT(*) as count FROM fahrten WHERE abrechnung = (SELECT kennzeichen FROM abrechnungstraeger WHERE id = ?)',
            [id]
        );
        return rows[0].count > 0;
    }
    
    static async delete(id, userId) {
        const [fahrten] = await db.execute(
            'SELECT COUNT(*) as count FROM fahrten f JOIN abrechnungstraeger a ON f.abrechnung = a.kennzeichen COLLATE utf8mb4_unicode_ci WHERE a.id = ?',
            [id]
        );
        
        if (fahrten[0].count > 0) {
            throw new Error('Abrechnungsträger wird noch in Fahrten verwendet.');
        }
        
        const [result] = await db.execute(
            'DELETE FROM abrechnungstraeger WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        return result.affectedRows > 0;
    }

    static async getErstattungshistorie(id, userId) {
        const [rows] = await db.execute(`
        SELECT eb.id, eb.betrag, eb.gueltig_ab, eb.created_at
        FROM erstattungsbetraege eb
        JOIN abrechnungstraeger a ON eb.abrechnungstraeger_id = a.id
        WHERE eb.abrechnungstraeger_id = ? 
        AND a.user_id = ?
        ORDER BY eb.gueltig_ab DESC`,
            [id, userId]
        );
        return rows;
    }
}

module.exports = AbrechnungsTraeger;