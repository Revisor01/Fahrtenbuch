const db = require('../config/database');

async function getDistance(vonOrtId, nachOrtId, userId) {
  try {
    console.log('getDistance input:', { vonOrtId, nachOrtId, userId });
    const [rows] = await db.execute(
      'SELECT distanz FROM distanzen WHERE ((von_ort_id = ? AND nach_ort_id = ?) OR (von_ort_id = ? AND nach_ort_id = ?)) AND user_id = ?',
      [vonOrtId, nachOrtId, nachOrtId, vonOrtId, userId]
    );
    
    if (rows.length > 0) {
      console.log('Distance found:', rows[0].distanz);
      return rows[0].distanz;
    } else {
      console.log('No distance found');
      return 0; // Rückgabe von 0 statt null
    }
  } catch (error) {
    console.error('Fehler beim Abrufen der Distanz:', error);
    return 0; // Rückgabe von 0 im Fehlerfall
  }
}


async function getDienstort(userId) {
  try {
    const [rows] = await db.execute('SELECT id FROM orte WHERE ist_dienstort = true AND user_id = ? LIMIT 1', [userId]);
    if (rows.length > 0) {
      return rows[0].id;
    } else {
      throw new Error('Kein Dienstort gefunden');
    }
  } catch (error) {
    console.error('Fehler beim Abrufen des Dienstorts:', error);
    throw error;
  }
}

async function getWohnort(userId) {
  try {
    const [rows] = await db.execute('SELECT id FROM orte WHERE ist_wohnort = true AND user_id = ? LIMIT 1', [userId]);
    if (rows.length > 0) {
      return rows[0].id;
    } else {
      throw new Error('Kein Wohnort gefunden');
    }
  } catch (error) {
    console.error('Fehler beim Abrufen des Wohnorts:', error);
    throw error;
  }
}

exports.updateDistanz = async (req, res) => {
  try {
    const { id } = req.params;
    const { vonOrtId, nachOrtId, distanz } = req.body;
    const userId = req.user.id;
    
    // Aktualisiere die Distanz
    const updatedDistanz = await Distanz.update(id, vonOrtId, nachOrtId, distanz, userId);
    
    if (updatedDistanz) {
      // Aktualisiere alle betroffenen Fahrten
      await Fahrt.updateFahrtenByDistanz(vonOrtId, nachOrtId, distanz, userId);
      
      res.status(200).json({ message: 'Distanz und betroffene Fahrten erfolgreich aktualisiert' });
    } else {
      res.status(404).json({ message: 'Distanz nicht gefunden' });
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Distanz:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren der Distanz', error: error.message });
  }
};

module.exports = {
  getDistance,
  getDienstort,
  getWohnort
};