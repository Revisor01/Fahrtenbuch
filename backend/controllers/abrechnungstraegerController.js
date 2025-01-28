const db = require('../config/database');
const AbrechnungsTraeger = require('../models/AbrechnungsTraeger');

exports.getAllAbrechnungstraeger = async (req, res) => {
    try {
        const traeger = await AbrechnungsTraeger.findAllForUser(req.user.id);
        res.json(traeger);
    } catch (error) {
        console.error('Fehler beim Abrufen der Abrechnungsträger:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};

exports.getSimpleList = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT id, name, kennzeichen, active
            FROM abrechnungstraeger 
            WHERE user_id = ? AND active = TRUE
            ORDER BY sort_order ASC`,
            [req.user.id]
        );
        res.json({ data: rows });
    } catch (error) {
        console.error('Fehler beim Abrufen der Liste:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};

exports.updateErstattungssatz = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        const { id, erstattungssatzId } = req.params;
        const { betrag, gueltig_ab } = req.body;
        
        // Prüfen ob der Satz dem User gehört
        const [berechtigung] = await connection.execute(
            'SELECT 1 FROM abrechnungstraeger WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );
        
        if (berechtigung.length === 0) {
            return res.status(403).json({ message: 'Keine Berechtigung' });
        }
        
        await connection.execute(
            'UPDATE erstattungsbetraege SET betrag = ?, gueltig_ab = ? WHERE id = ? AND abrechnungstraeger_id = ?',
            [betrag, gueltig_ab, erstattungssatzId, id]
        );
        
        await connection.commit();
        res.json({ message: 'Erstattungssatz erfolgreich aktualisiert' });
    } catch (error) {
        await connection.rollback();
        console.error('Fehler beim Aktualisieren des Erstattungssatzes:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    } finally {
        connection.release();
    }
};

exports.deleteErstattungssatz = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        const { id, erstattungssatzId } = req.params;
        
        // Prüfen ob es der letzte Satz ist
        const [saetze] = await connection.execute(
            'SELECT COUNT(*) as count FROM erstattungsbetraege WHERE abrechnungstraeger_id = ?',
            [id]
        );
        
        if (saetze[0].count <= 1) {
            return res.status(400).json({ message: 'Der letzte Erstattungssatz kann nicht gelöscht werden' });
        }
        
        await connection.execute(
            'DELETE FROM erstattungsbetraege WHERE id = ? AND abrechnungstraeger_id = ?',
            [erstattungssatzId, id]
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

exports.getErstattungshistorie = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute(`
            SELECT id, betrag, gueltig_ab, created_at
            FROM erstattungsbetraege
            WHERE abrechnungstraeger_id = ?
            ORDER BY gueltig_ab DESC`,
            [id]
        );
        res.json(rows);
    } catch (error) {
        console.error('Fehler beim Abrufen der Historie:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};

exports.createAbrechnungstraeger = async (req, res) => {
    try {
        const { name, kennzeichen, betrag, gueltig_ab } = req.body;
        
        if (!name || !kennzeichen) {
            return res.status(400).json({ message: 'Name und Kennzeichen sind erforderlich' });
        }

        const id = await AbrechnungsTraeger.create({
            userId: req.user.id,
            name,
            kennzeichen,
            betrag,
            gueltig_ab
        });

        res.status(201).json({ 
            id, 
            message: 'Abrechnungsträger erfolgreich erstellt' 
        });
    } catch (error) {
        console.error('Fehler beim Erstellen des Abrechnungsträgers:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};

exports.updateAbrechnungstraeger = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, active, betrag, gueltig_ab } = req.body;
        
        // Wenn nur betrag oder active aktualisiert werden soll
        if (betrag !== undefined) {
            // Erstattungsbetrag aktualisieren
            await db.execute(
                'INSERT INTO erstattungsbetraege (abrechnungstraeger_id, betrag, gueltig_ab) VALUES (?, ?, ?)',
                [id, betrag, gueltig_ab || new Date().toISOString().split('T')[0]]
            );
            return res.json({ message: 'Erstattungsbetrag aktualisiert' });
        }
        
        if (active !== undefined) {
            // Nur active-Status aktualisieren
            await db.execute(
                'UPDATE abrechnungstraeger SET active = ? WHERE id = ? AND user_id = ?',
                [active ? 1 : 0, id, req.user.id]
            );
            return res.json({ message: 'Status aktualisiert' });
        }
        
        // Falls name dabei ist, komplettes Update
        if (!name) {
            return res.status(400).json({ message: 'Name ist erforderlich für vollständiges Update' });
        }
        
        const success = await AbrechnungsTraeger.update(id, req.user.id, {
            name,
            active,
            betrag,
            gueltig_ab
        });
        
        if (success) {
            res.json({ message: 'Abrechnungsträger erfolgreich aktualisiert' });
        } else {
            res.status(404).json({ message: 'Abrechnungsträger nicht gefunden' });
        }
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Abrechnungsträgers:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};

exports.updateSortOrder = async (req, res) => {
    try {
        const { sortOrder } = req.body;

        if (!Array.isArray(sortOrder)) {
            return res.status(400).json({ message: 'Ungültiges Format für Sortierreihenfolge' });
        }

        await AbrechnungsTraeger.updateSortOrder(req.user.id, sortOrder);
        res.json({ message: 'Sortierreihenfolge aktualisiert' });
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Sortierreihenfolge:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};

exports.deleteAbrechnungstraeger = async (req, res) => {
    try {
        const { id } = req.params;
        
        await AbrechnungsTraeger.delete(id, req.user.id);
        res.json({ message: 'Abrechnungsträger erfolgreich gelöscht' });
    } catch (error) {
        if (error.message.includes('wird noch in Fahrten verwendet')) {
            return res.status(400).json({ message: error.message });
        }
        console.error('Fehler beim Löschen des Abrechnungsträgers:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};
