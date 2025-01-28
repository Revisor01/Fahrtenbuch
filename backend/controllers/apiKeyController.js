const ApiKey = require('../models/ApiKey');

exports.generateKey = async (req, res) => {
    try {
        const { description } = req.body;
        const userId = req.user.id;
        
        const { key } = await ApiKey.generate(userId, description);
        
        res.status(201).json({ 
            message: 'API-Schlüssel erfolgreich erstellt',
            key 
        });
    } catch (error) {
        console.error('Error generating API key:', error);
        res.status(500).json({ message: 'Fehler beim Erstellen des API-Schlüssels' });
    }
};

exports.listKeys = async (req, res) => {
    try {
        const userId = req.user.id;
        const keys = await ApiKey.listForUser(userId);
        res.json(keys);
    } catch (error) {
        console.error('Error listing API keys:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen der API-Schlüssel' });
    }
};

exports.permanentlyDelete = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        const deleted = await ApiKey.permanentlyDelete(id, userId);
        if (deleted) {
            res.json({ message: 'API-Schlüssel wurde permanent gelöscht' });
        } else {
            res.status(404).json({ message: 'API-Schlüssel nicht gefunden oder noch aktiv' });
        }
    } catch (error) {
        console.error('Error permanently deleting API key:', error);
        res.status(500).json({ message: 'Fehler beim Löschen des API-Schlüssels' });
    }
};

exports.revokeKey = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        const revoked = await ApiKey.revoke(id, userId);
        if (revoked) {
            res.json({ message: 'API-Schlüssel erfolgreich widerrufen' });
        } else {
            res.status(404).json({ message: 'API-Schlüssel nicht gefunden' });
        }
    } catch (error) {
        console.error('Error revoking API key:', error);
        res.status(500).json({ message: 'Fehler beim Widerrufen des API-Schlüssels' });
    }
};

exports.testKey = async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'API Key ist gültig',
            user: {
                id: req.user.id,
                username: req.user.username,
                email: req.user.email
            }
        });
    } catch (error) {
        console.error('Error testing API key:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};