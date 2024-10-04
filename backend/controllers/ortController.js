const Ort = require('../models/Ort');

exports.createOrt = async (req, res) => {
  try {
    const { name, adresse, istWohnort, istDienstort, istKirchspiel } = req.body;
    const userId = req.user.id; // Annahme: Der Benutzer ist authentifiziert
    
    // Überprüfen, ob alle erforderlichen Felder vorhanden sind
    if (!name || !adresse) {
      return res.status(400).json({ message: 'Name und Adresse sind erforderlich' });
    }
    
    // Standardwerte für istWohnort und istDienstort setzen, falls nicht angegeben
    const wohnort = istWohnort === undefined ? false : !!istWohnort;
    const dienstort = istDienstort === undefined ? false : !!istDienstort;
    const kirchspiel = istKirchspiel === undefined ? false : !!istKirchspiel;
    
    const id = await Ort.create(name, adresse, istWohnort, istDienstort, istKirchspiel, userId);
    res.status(201).json({ id, message: 'Ort erfolgreich erstellt' });
  } catch (error) {
    console.error('Fehler beim Erstellen des Ortes:', error);
    res.status(500).json({ message: 'Fehler beim Erstellen des Ortes', error: error.message });
  }
};

exports.deleteOrt = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isUsed = await Ort.isUsedInFahrten(id);
    if (isUsed) {
      return res.status(400).json({ message: 'Ort kann nicht gelöscht werden, da er in Fahrten verwendet wird' });
    }
    const deleted = await Ort.delete(id, userId);
    if (deleted) {
      res.status(200).json({ message: 'Ort erfolgreich gelöscht' });
    } else {
      res.status(404).json({ message: 'Ort nicht gefunden' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Löschen des Ortes', error: error.message });
  }
};

exports.getAllOrte = async (req, res) => {
  try {
    const userId = req.user.id;
    const orte = await Ort.findAll(userId);
    res.status(200).json(orte);
  } catch (error) {
    console.error('Fehler beim Abrufen der Orte:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Orte', error: error.message });
  }
};

exports.getOrtById = async (req, res) => {
  try {
    const userId = req.user.id;
    const ort = await Ort.findById(req.params.id, userId);
    if (ort) {
      res.status(200).json(ort);
    } else {
      res.status(404).json({ message: 'Ort nicht gefunden' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Abrufen des Ortes', error });
  }
};

    exports.updateOrt = async (req, res) => {
      try {
        const { id } = req.params;
        const { name, adresse, ist_wohnort, ist_dienstort, ist_kirchspiel } = req.body; // Anpassen der Variablen
        const userId = req.user.id;
        
        if (!name || !adresse) {
          return res.status(400).json({ message: 'Name und Adresse sind erforderlich' });
        }
        
        // Die Werte jetzt korrekt setzen
        const wohnort = ist_wohnort === undefined ? false : !!ist_wohnort;
        const dienstort = ist_dienstort === undefined ? false : !!ist_dienstort;
        const kirchspiel = ist_kirchspiel === undefined ? false : !!ist_kirchspiel;
        
        const updated = await Ort.update(id, name, adresse, wohnort, dienstort, kirchspiel, userId); // Anpassen der Variablen
        if (updated) {
          res.status(200).json({ message: 'Ort erfolgreich aktualisiert' });
        } else {
          res.status(404).json({ message: 'Ort nicht gefunden' });
        }
      } catch (error) {
        console.error('Fehler beim Aktualisieren des Ortes:', error);
        res.status(500).json({ message: 'Fehler beim Aktualisieren des Ortes', error: error.message });
      }
    };
