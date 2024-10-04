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

async function calculateAutoSplit(vonOrtId, nachOrtId, userId) {
  try {
    console.log('calculateAutoSplit input:', { vonOrtId, nachOrtId, userId });
    
    const dienstortId = await getDienstort(userId);
    const wohnortId = await getWohnort(userId);
    
    console.log('Dienstort and Wohnort:', { dienstortId, wohnortId });
    
    if (!dienstortId || !wohnortId) {
      throw new Error('Dienstort oder Wohnort nicht gefunden');
    }
    
    const distanzWohnortDienstort = await getDistance(wohnortId, dienstortId, userId);
    const distanzVonDienstort = await getDistance(vonOrtId, dienstortId, userId);
    const distanzNachDienstort = await getDistance(dienstortId, nachOrtId, userId);
    
    console.log('Distances:', { distanzWohnortDienstort, distanzVonDienstort, distanzNachDienstort });
    
    const distanzVonNach = distanzVonDienstort + distanzNachDienstort;
    
    let kirchenkreisKm = 0, gemeindeKm = 0, 
    kirchenkreisVonOrtId = null, kirchenkreisNachOrtId = null, 
    gemeindeVonOrtId = null, gemeindeNachOrtId = null;
    
    if (vonOrtId == wohnortId) {
      kirchenkreisKm = distanzWohnortDienstort;
      gemeindeKm = distanzVonNach - distanzWohnortDienstort;
      kirchenkreisVonOrtId = wohnortId;
      kirchenkreisNachOrtId = dienstortId;
      gemeindeVonOrtId = dienstortId;
      gemeindeNachOrtId = nachOrtId;
    } else if (nachOrtId == wohnortId) {
      gemeindeKm = distanzVonNach - distanzWohnortDienstort;
      kirchenkreisKm = distanzWohnortDienstort;
      gemeindeVonOrtId = vonOrtId;
      gemeindeNachOrtId = dienstortId;
      kirchenkreisVonOrtId = dienstortId;
      kirchenkreisNachOrtId = wohnortId;
    } else {
      gemeindeKm = distanzVonNach;
      gemeindeVonOrtId = vonOrtId;
      gemeindeNachOrtId = nachOrtId;
    }
    
    const result = {
      kirchenkreis: Math.max(kirchenkreisKm, 0),
      gemeinde: Math.max(gemeindeKm, 0),
      gesamt: distanzVonNach,
      kirchenkreisVonOrtId,
      kirchenkreisNachOrtId,
      gemeindeVonOrtId,
      gemeindeNachOrtId
    };
    
    console.log('calculateAutoSplit result:', result);
    return result;
  } catch (error) {
    console.error('Fehler in calculateAutoSplit:', error);
    throw error;
  }
}

module.exports = {
  getDistance,
  getDienstort,
  getWohnort,
  calculateAutoSplit
};