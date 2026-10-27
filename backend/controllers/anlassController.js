const Anlass = require('../models/Anlass');

exports.getAllAnlaesse = async (req, res) => {
  try {
    const anlaesse = await Anlass.findAll(req.user.id);
    res.status(200).json(anlaesse);
  } catch (error) {
    console.error('Fehler beim Abrufen der Anlässe:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Anlässe' });
  }
};

exports.getAnlassById = async (req, res) => {
  try {
    const anlass = await Anlass.findById(req.params.id, req.user.id);
    if (!anlass) {
      return res.status(404).json({ message: 'Anlass nicht gefunden' });
    }
    res.status(200).json(anlass);
  } catch (error) {
    console.error('Fehler beim Abrufen des Anlasses:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen des Anlasses' });
  }
};

exports.createAnlass = async (req, res) => {
  try {
    const { name, sortOrder } = req.body;
    const { anlass, neu } = await Anlass.create(req.user.id, name, sortOrder);

    // Duplikat ist im Modal der Normalfall; 200 statt 201 macht es unterscheidbar.
    res.status(neu ? 201 : 200).json(anlass);
  } catch (error) {
    console.error('Fehler beim Erstellen des Anlasses:', error);
    res.status(500).json({ message: 'Fehler beim Erstellen des Anlasses' });
  }
};

exports.updateAnlass = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const vorhanden = await Anlass.findById(id, userId);
    if (!vorhanden) {
      return res.status(404).json({ message: 'Anlass nicht gefunden' });
    }

    // Belegten Namen vor dem UNIQUE-Schlüssel abfangen.
    if (req.body.name !== undefined) {
      const namensZwilling = await Anlass.findByName(userId, req.body.name);
      if (namensZwilling && String(namensZwilling.id) !== String(id)) {
        return res.status(400).json({ message: 'Ein Anlass mit diesem Namen existiert bereits' });
      }
    }

    await Anlass.update(id, userId, req.body);
    const anlass = await Anlass.findById(id, userId);
    res.status(200).json(anlass);
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Anlasses:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren des Anlasses' });
  }
};

/** Bulk-Umsortierung mit der kompletten neuen Reihenfolge. */
exports.updateSortOrder = async (req, res) => {
  try {
    const { sortOrder } = req.body;
    await Anlass.updateSortOrder(req.user.id, sortOrder);
    res.json({ message: 'Sortierung aktualisiert' });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Sortierung:', error);
    res.status(500).json({ message: 'Sortierung konnte nicht aktualisiert werden' });
  }
};

exports.deleteAnlass = async (req, res) => {
  try {
    // Ohne Verwendungsprüfung, Fahrten behalten ihren Anlass-Text.
    const deleted = await Anlass.delete(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Anlass nicht gefunden' });
    }
    res.status(200).json({ message: 'Anlass erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Anlasses:', error);
    res.status(500).json({ message: 'Fehler beim Löschen des Anlasses' });
  }
};
