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
            SELECT id, name, active
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
    try {
        const { id, erstattungssatzId } = req.params;
        const { betrag, gueltig_ab } = req.body;
        
        // Validierung der Eingabewerte
        if (betrag === undefined || betrag === null || isNaN(parseFloat(betrag))) {
            return res.status(400).json({ message: 'Betrag muss eine gültige Zahl sein' });
        }
        
        // Prüfen ob für das neue Datum bereits ein anderer Eintrag existiert
        if (gueltig_ab) {
            const [existing] = await db.execute(
                'SELECT id FROM erstattungsbetraege WHERE abrechnungstraeger_id = ? AND gueltig_ab = ? AND id != ?',
                [id, gueltig_ab, erstattungssatzId]
            );
            
            if (existing.length > 0) {
                return res.status(400).json({ 
                    message: 'Es existiert bereits ein Eintrag für dieses Datum',
                    error: 'Duplicate entry'
                });
            }
        }
        
        // Update nur die Felder, die wirklich geändert wurden
        const updates = [];
        const values = [];
        
        if (betrag !== undefined) {
            updates.push('betrag = ?');
            values.push(parseFloat(betrag));
        }
        if (gueltig_ab !== undefined) {
            updates.push('gueltig_ab = ?');
            values.push(gueltig_ab);
        }
        
        values.push(erstattungssatzId);
        values.push(id);
        
        const [result] = await db.execute(
            `UPDATE erstattungsbetraege 
            SET ${updates.join(', ')} 
            WHERE id = ? AND abrechnungstraeger_id = ?`,
            values
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Erstattungssatz nicht gefunden' });
        }
        
        res.json({ message: 'Erstattungssatz erfolgreich aktualisiert' });
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Erstattungssatzes:', error);
        res.status(500).json({ 
            message: 'Erstattungssatz konnte nicht aktualisiert werden',
            error: error.message 
        });
    }
};

const updateKennzeichen = async (oldKennzeichen, newKennzeichen) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        // Update alle Fahrten
        await connection.execute(
            'UPDATE fahrten SET abrechnung = ? WHERE abrechnung = ?',
            [newKennzeichen, oldKennzeichen]
        );
        
        // Update den Abrechnungsträger
        await connection.execute(
            'UPDATE abrechnungstraeger SET kennzeichen = ? WHERE kennzeichen = ?',
            [newKennzeichen, oldKennzeichen]
        );
        
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
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
        const [rows] = await db.execute(`
            SELECT id, betrag, gueltig_ab, created_at
            FROM erstattungsbetraege
            WHERE abrechnungstraeger_id = ?
            ORDER BY gueltig_ab DESC, created_at DESC`,
            [req.params.id]
        );
        // Entferne Duplikate basierend auf gueltig_ab
        const uniqueRows = rows.reduce((acc, current) => {
            const x = acc.find(item => item.gueltig_ab === current.gueltig_ab);
            if (!x) {
                return acc.concat([current]);
            } else {
                return acc;
            }
        }, []);
        res.json(uniqueRows);
    } catch (error) {
        console.error('Fehler beim Abrufen der Historie:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};

exports.createAbrechnungstraeger = async (req, res) => {
    try {
        const { name} = req.body; // Kennzeichen wird nicht mehr aus dem Request geholt
        
        if (!name) {
            return res.status(400).json({ message: 'Name ist erforderlich' });
        }
        
        const id = await AbrechnungsTraeger.create({
            userId: req.user.id,
            name,
        });
        
        res.status(201).json({
            id,
            message: 'Abrechnungsträger erfolgreich erstellt',
        });
    } catch (error) {
        console.error('Fehler beim Erstellen des Abrechnungsträgers:', error);
        res.status(500).json({ message: 'Interner Server-Fehler', error: error.message }); // Füge error.message hinzu
    }
};

exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute(
            'SELECT id, name, active FROM abrechnungstraeger WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Abrechnungsträger nicht gefunden' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Fehler beim Abrufen des Abrechnungsträgers:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};

exports.updateAbrechnungstraeger = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, active } = req.body;
        
        // Wenn nur active aktualisiert werden soll
        if (active !== undefined && Object.keys(req.body).length === 1) {
            const [result] = await db.execute(
                'UPDATE abrechnungstraeger SET active = ? WHERE id = ? AND user_id = ?',
                [active ? 1 : 0, id, req.user.id]
            );
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Abrechnungsträger nicht gefunden' });
            }
            
            return res.json({ message: 'Status erfolgreich aktualisiert' });
        }
        
        // Vollständiges Update
        if (name !== undefined) {
            if (!name) {
                return res.status(400).json({ message: 'Name ist erforderlich' });
            }
            
            const [result] = await db.execute(
                'UPDATE abrechnungstraeger SET name = ? WHERE id = ? AND user_id = ?',
                [name, id, req.user.id]
            );
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Abrechnungsträger nicht gefunden' });
            }
            
            return res.json({ message: 'Abrechnungsträger erfolgreich aktualisiert' });
        }
        
        res.status(400).json({ message: 'Ungültige Aktualisierungsanfrage' });
        
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Abrechnungsträgers:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};

exports.addErstattungssatz = async (req, res) => {
    try {
        const { id } = req.params;
        const { betrag, gueltig_ab } = req.body;
        
        // Validierung der Eingabewerte
        if (betrag === undefined || betrag === null || isNaN(parseFloat(betrag))) {
            return res.status(400).json({ message: 'Betrag muss eine gültige Zahl sein' });
        }
        
        await db.execute(
            'INSERT INTO erstattungsbetraege (abrechnungstraeger_id, betrag, gueltig_ab) VALUES (?, ?, ?)',
            [id, parseFloat(betrag), gueltig_ab || new Date().toISOString().split('T')[0]]
        );
        
        res.status(201).json({ message: 'Erstattungssatz erfolgreich hinzugefügt' });
    } catch (error) {
        console.error('Fehler beim Hinzufügen des Erstattungssatzes:', error);
        res.status(500).json({ 
            message: 'Erstattungssatz konnte nicht hinzugefügt werden',
            error: error.message 
        });
    }
};

exports.updateSortOrder = async (req, res) => {
    try {
        const { sortOrder } = req.body;
        
        await Promise.all(sortOrder.map(item => 
            db.execute(
                'UPDATE abrechnungstraeger SET sort_order = ? WHERE id = ? AND user_id = ?',
                [item.sort_order, item.id, req.user.id]
            )
        ));
        
        res.json({ message: 'Sortierung aktualisiert' });
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Sortierung:', error);
        res.status(500).json({ message: 'Sortierung konnte nicht aktualisiert werden' });
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