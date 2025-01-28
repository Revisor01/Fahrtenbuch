const MitfahrerErstattung = require('../models/MitfahrerErstattung');

exports.getCurrentBetrag = async (req, res) => {
    try {
        const betrag = await MitfahrerErstattung.getCurrentBetrag(req.user.id);
        res.json(betrag || { betrag: 0.05 }); // Standard wenn noch nichts gesetzt
    } catch (error) {
        console.error('Fehler beim Abrufen des Mitfahrer-Erstattungsbetrags:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};

exports.getHistorie = async (req, res) => {
    try {
        const historie = await MitfahrerErstattung.getHistorie(req.user.id);
        res.json(historie);
    } catch (error) {
        console.error('Fehler beim Abrufen der Mitfahrer-Erstattungshistorie:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};

exports.setBetrag = async (req, res) => {
    try {
        const { betrag, gueltig_ab } = req.body;
        
        if (!betrag || betrag <= 0) {
            return res.status(400).json({ message: 'Ungültiger Erstattungsbetrag' });
        }

        await MitfahrerErstattung.setBetrag(req.user.id, betrag, gueltig_ab);
        res.json({ message: 'Mitfahrer-Erstattungsbetrag erfolgreich gesetzt' });
    } catch (error) {
        console.error('Fehler beim Setzen des Mitfahrer-Erstattungsbetrags:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};