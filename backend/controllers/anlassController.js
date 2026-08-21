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

    // Existiert der Anlass schon, gilt das nicht als Fehler: das Modal legt
    // Anlaesse nebenbei an, dort ist ein Duplikat der Normalfall. 200 statt
    // 201 macht fuer das Frontend trotzdem unterscheidbar, was passiert ist.
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

    // Umbenennen auf einen bereits belegten Namen wuerde am UNIQUE-Schluessel
    // scheitern - vorher abfangen und als Klartext beantworten.
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

exports.deleteAnlass = async (req, res) => {
  try {
    // Bewusst ohne Verwendungspruefung: bestehende Fahrten behalten ihren
    // Anlass-Text, es haengt kein Fremdschluessel daran.
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
