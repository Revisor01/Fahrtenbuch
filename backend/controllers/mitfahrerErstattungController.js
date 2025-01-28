const db = require('../config/database');

exports.getCurrentBetrag = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT betrag, gueltig_ab 
            FROM mitfahrer_erstattung 
            WHERE user_id = ? 
            AND gueltig_ab <= CURRENT_DATE()
            ORDER BY gueltig_ab DESC 
            LIMIT 1`,
            [req.user.id]
        );
        res.json(rows[0] || { betrag: 0.05 });
    } catch (error) {
        console.error('Fehler beim Abrufen des Erstattungssatzes:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};

exports.getHistorie = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT id, betrag, gueltig_ab, created_at
            FROM mitfahrer_erstattung
            WHERE user_id = ?
            ORDER BY gueltig_ab DESC`,
            [req.user.id]
        );
        res.json(rows);
    } catch (error) {
        console.error('Fehler beim Abrufen der Historie:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};

exports.setBetrag = async (req, res) => {
    const { betrag, gueltig_ab } = req.body;
    try {
        const [result] = await db.execute(
            'INSERT INTO mitfahrer_erstattung (user_id, betrag, gueltig_ab) VALUES (?, ?, ?)',
            [req.user.id, betrag, gueltig_ab || new Date().toISOString().split('T')[0]]
        );
        res.json({ message: 'Erstattungssatz erfolgreich gesetzt' });
    } catch (error) {
        console.error('Fehler beim Setzen des Erstattungssatzes:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};

exports.updateErstattungssatz = async (req, res) => {
    const { erstattungssatzId } = req.params;
    const { betrag, gueltig_ab } = req.body;
    try {
        const [result] = await db.execute(
            'UPDATE mitfahrer_erstattung SET betrag = ?, gueltig_ab = ? WHERE id = ? AND user_id = ?',
            [betrag, gueltig_ab, erstattungssatzId, req.user.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Erstattungssatz nicht gefunden' });
        }
        res.json({ message: 'Erstattungssatz erfolgreich aktualisiert' });
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Erstattungssatzes:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};

exports.deleteErstattungssatz = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        const { erstattungssatzId } = req.params;
        const userId = req.user.id;
        
        // Prüfen ob es der letzte Satz ist
        const [saetze] = await connection.execute(
            'SELECT COUNT(*) as count FROM mitfahrer_erstattung WHERE user_id = ?',
            [userId]
        );
        
        if (saetze[0].count <= 1) {
            return res.status(400).json({ message: 'Der letzte Erstattungssatz kann nicht gelöscht werden' });
        }
        
        await connection.execute(
            'DELETE FROM mitfahrer_erstattung WHERE id = ? AND user_id = ?',
            [erstattungssatzId, userId]
        );
        
        await connection.commit();
        res.json({ message: 'Erstattungssatz erfolgreich gelöscht' });
    } catch (error) {
        await connection.rollback();
        console.error('Fehler beim Löschen des Erstattungssatzes:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    } finally {
        connection.release();
    }
};