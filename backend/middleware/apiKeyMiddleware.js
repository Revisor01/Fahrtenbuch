const ApiKey = require('../models/ApiKey');

const apiKeyMiddleware = async (req, res, next) => {
    const apiKey = req.header('X-API-Key');
    
    if (!apiKey) {
        return res.status(401).json({ message: 'API-Schlüssel fehlt' });
    }

    try {
        const keyData = await ApiKey.validate(apiKey);
        if (!keyData) {
            return res.status(401).json({ message: 'Ungültiger API-Schlüssel' });
        }

        // Setze User-Informationen für die weitere Verarbeitung
        req.user = {
            id: keyData.user_id,
            role: keyData.role,
            email_verified: keyData.email_verified
        };
        
        // Aktualisiere last_used_at
        await ApiKey.updateLastUsed(keyData.id);
        
        next();
    } catch (error) {
        console.error('API Key validation error:', error);
        res.status(500).json({ message: 'Fehler bei der API-Schlüssel-Validierung' });
    }
};

module.exports = apiKeyMiddleware;