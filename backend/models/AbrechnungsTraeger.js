const db = require('../config/database');

class AbrechnungsTraeger {
    static async findAllForUser(userId) {
        try {
            // Erst die Basis-Abrechnungsträger holen
            const [traeger] = await db.execute(`
            SELECT at.*
            FROM abrechnungstraeger at
            WHERE at.user_id = ?
            ORDER BY at.sort_order ASC`,
                [userId]
            );

            // Dann für jeden Abrechnungsträger den aktuellen Betrag holen
            const [aktuelleBetraege] = await db.execute(`
            SELECT 
                eb.abrechnungstraeger_id,
                eb.betrag as aktueller_betrag,
                eb.gueltig_ab as betrag_gueltig_ab
            FROM erstattungsbetraege eb
            INNER JOIN (
                SELECT abrechnungstraeger_id, MAX(gueltig_ab) as max_gueltig_ab
                FROM erstattungsbetraege
                WHERE gueltig_ab <= CURRENT_DATE()
                GROUP BY abrechnungstraeger_id
            ) max_dates 
            ON eb.abrechnungstraeger_id = max_dates.abrechnungstraeger_id 
            AND eb.gueltig_ab = max_dates.max_gueltig_ab`
            );

            // Aktuelle Beträge den Trägern zuordnen
            return traeger.map(t => {
                const aktuellerBetrag = aktuelleBetraege.find(
                    b => b.abrechnungstraeger_id === t.id
                );
                return {
                    ...t,
                    aktueller_betrag: aktuellerBetrag?.aktueller_betrag || null,
                    betrag_gueltig_ab: aktuellerBetrag?.betrag_gueltig_ab || null
                };
            });

        } catch (error) {
            console.error('Fehler in findAllForUser:', error);
            throw error;
        }
    }

    static async findById(id, userId) {
        try {
            const [rows] = await db.execute(`
                SELECT id, name, active
                FROM abrechnungstraeger 
                WHERE id = ? AND user_id = ?`,
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
            
            if (!userData.name) {
                throw new Error('Ein Name muss vorhanden sein!')
            }
            
            const [result] = await connection.execute(
                'INSERT INTO abrechnungstraeger (user_id, name, sort_order) VALUES (?, ?, ?)',
                [userData.userId, userData.name, userData.sortOrder]
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
            console.error('Fehler in create:', error);
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
            'SELECT COUNT(*) as count FROM fahrten WHERE abrechnung = ?',
            [id]
        );
        return rows[0].count > 0;
    }

    static async delete(id, userId) {
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