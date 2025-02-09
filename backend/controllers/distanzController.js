const Distanz = require('../models/Distanz');
const { getDistance, calculateAutoSplit } = require('../utils/distanceCalculator');

exports.createOrUpdateDistanz = async (req, res) => {
  try {
    const { vonOrtId, nachOrtId, distanz } = req.body;
    const userId = req.user.id;
    
    if (!vonOrtId || !nachOrtId || distanz === undefined) {
      return res.status(400).json({ message: 'Alle Felder sind erforderlich' });
    }

    const result = await Distanz.createOrUpdate(vonOrtId, nachOrtId, distanz, userId);
    res.status(201).json({ result, message: 'Distanz erfolgreich erstellt oder aktualisiert' });
  } catch (error) {
    console.error('Fehler beim Erstellen oder Aktualisieren der Distanz:', error);
    res.status(500).json({ message: 'Fehler beim Erstellen oder Aktualisieren der Distanz', error: error.message });
  }
};

exports.deleteDistanz = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const deleted = await Distanz.delete(id, userId);
    if (deleted) {
      res.status(200).json({ message: 'Distanz erfolgreich gelöscht' });
    } else {
      res.status(404).json({ message: 'Distanz nicht gefunden' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Löschen der Distanz', error: error.message });
  }
};


exports.getAutoSplitDistance = async (req, res) => {
  try {
    const { vonOrtId, nachOrtId } = req.query;
    const userId = req.user.id;
    
    if (!vonOrtId || !nachOrtId) {
      return res.status(400).json({ message: 'Von-Ort-ID und Nach-Ort-ID sind erforderlich' });
    }
    
    const splitResult = await calculateAutoSplit(vonOrtId, nachOrtId, userId);
    res.status(200).json(splitResult);
  } catch (error) {
    console.error('Fehler beim Berechnen der Autosplit-Distanz:', error);
    res.status(500).json({ message: 'Fehler beim Berechnen der Autosplit-Distanz', error: error.message });
  }
};

exports.getDistanz = async (req, res) => {
  try {
    const { vonOrtId, nachOrtId } = req.query;
    const userId = req.user.id;
    
    if (!vonOrtId || !nachOrtId) {
      return res.status(400).json({ message: 'Von-Ort-ID und Nach-Ort-ID sind erforderlich' });
    }
    
    const distanz = await Distanz.getDistance(vonOrtId, nachOrtId, userId);
    if (distanz !== null) {
      res.status(200).json({ distanz });
    } else {
      res.status(404).json({ message: 'Distanz nicht gefunden' });
    }
  } catch (error) {
    console.error('Fehler beim Abrufen der Distanz:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Distanz', error: error.message });
  }
};

exports.updateDistanz = async (req, res) => {
  try {
    const { id } = req.params;
    const { vonOrtId, nachOrtId, distanz } = req.body;
    const userId = req.user.id;
    
    if (!vonOrtId || !nachOrtId || distanz === undefined) {
      return res.status(400).json({ message: 'Alle Felder sind erforderlich' });
    }
    
    const result = await Distanz.update(id, vonOrtId, nachOrtId, distanz, userId);
    if (result) {
      res.status(200).json({ message: 'Distanz erfolgreich aktualisiert' });
    } else {
      res.status(404).json({ message: 'Distanz nicht gefunden' });
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Distanz:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren der Distanz', error: error.message });
  }
};

exports.getAllDistanzen = async (req, res) => {
  try {
    const userId = req.user.id;
    const distanzen = await Distanz.findAll(userId);
    res.status(200).json(distanzen);
  } catch (error) {
    console.error('Fehler beim Abrufen aller Distanzen:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen aller Distanzen', error: error.message });
  }
};