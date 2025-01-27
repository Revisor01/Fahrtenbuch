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