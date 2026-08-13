const FavoritFahrt = require('../models/FavoritFahrt');
const Fahrt = require('../models/Fahrt');
const { getDistance } = require('../utils/distanceCalculator');
const { createFavoritSchema } = require('../schemas/favoritSchemas');
const db = require('../config/database');

// Ownership-Check: gehört die ID in der Tabelle dem eingeloggten User?
async function gehoertUser(tabelle, id, userId) {
  const [rows] = await db.execute(
    `SELECT id FROM ${tabelle} WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return rows.length > 0;
}

exports.getAllFavoriten = async (req, res) => {
  try {
    const favoriten = await FavoritFahrt.findAll(req.user.id);
    res.json(favoriten);
  } catch (error) {
    console.error('Fehler beim Abrufen der Favoriten:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Favoriten' });
  }
};

exports.createFavorit = async (req, res) => {
  try {
    const data = createFavoritSchema.parse(req.body);

    // Ort-/Träger-Ownership: fremde IDs abweisen
    if (!(await gehoertUser('orte', data.vonOrtId, req.user.id)) ||
        !(await gehoertUser('orte', data.nachOrtId, req.user.id))) {
      return res.status(400).json({ message: 'Ort nicht gefunden' });
    }
    if (!(await gehoertUser('abrechnungstraeger', data.abrechnungstraegerId, req.user.id))) {
      return res.status(400).json({ message: 'Abrechnungsträger nicht gefunden' });
    }

    const id = await FavoritFahrt.create(data, req.user.id);
    const favorit = await FavoritFahrt.findById(id, req.user.id);
    res.status(201).json(favorit);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        message: 'Validierungsfehler',
        errors: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    console.error('Fehler beim Erstellen des Favoriten:', error);
    res.status(500).json({ message: 'Fehler beim Erstellen des Favoriten' });
  }
};

exports.deleteFavorit = async (req, res) => {
  try {
    const deleted = await FavoritFahrt.delete(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Favorit nicht gefunden' });
    }
    res.json({ message: 'Favorit erfolgreich geloescht' });
  } catch (error) {
    console.error('Fehler beim Loeschen des Favoriten:', error);
    res.status(500).json({ message: 'Fehler beim Loeschen des Favoriten' });
  }
};

exports.executeFavorit = async (req, res) => {
  try {
    const favorit = await FavoritFahrt.findById(req.params.id, req.user.id);
    if (!favorit) {
      return res.status(404).json({ message: 'Favorit nicht gefunden' });
    }

    const { mitRueckfahrt = false } = req.body || {};

    // Kilometer berechnen
    const kilometer = await getDistance(favorit.von_ort_id, favorit.nach_ort_id, req.user.id);

    // Heutiges Datum im Format YYYY-MM-DD
    const heute = new Date();
    const datum = `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, '0')}-${String(heute.getDate()).padStart(2, '0')}`;

    const fahrtData = {
      datum,
      anlass: favorit.anlass,
      kilometer: kilometer || 0,
      abrechnung: favorit.abrechnungstraeger_id,
      vonOrtId: favorit.von_ort_id,
      nachOrtId: favorit.nach_ort_id,
      einmaligerVonOrt: null,
      einmaligerNachOrt: null,
      userId: req.user.id,
    };

    const fahrtId = await Fahrt.create(fahrtData, null, req.user.id);

    // Rueckfahrt anlegen wenn gewuenscht
    if (mitRueckfahrt) {
      try {
        const rueckKilometer = await getDistance(favorit.nach_ort_id, favorit.von_ort_id, req.user.id);
        const rueckfahrtData = {
          datum,
          anlass: favorit.anlass,
          kilometer: rueckKilometer || kilometer || 0,
          abrechnung: favorit.abrechnungstraeger_id,
          vonOrtId: favorit.nach_ort_id,
          nachOrtId: favorit.von_ort_id,
          einmaligerVonOrt: null,
          einmaligerNachOrt: null,
          userId: req.user.id,
        };
        // Als Paar verknuepfen — beide Fahrten gehoeren zusammen
        await Fahrt.create(rueckfahrtData, null, req.user.id, [], fahrtId);
      } catch (rueckError) {
        console.error('Fehler beim Erstellen der Rueckfahrt:', rueckError);
      }
    }

    const message = mitRueckfahrt
      ? 'Hin- und Rueckfahrt aus Favorit erstellt'
      : 'Fahrt aus Favorit erfolgreich erstellt';
    res.status(201).json({ id: fahrtId, message });
  } catch (error) {
    console.error('Fehler beim Ausfuehren des Favoriten:', error);
    res.status(500).json({ message: 'Fehler beim Ausfuehren des Favoriten' });
  }
};
