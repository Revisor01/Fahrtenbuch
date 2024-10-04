const Fahrt = require('../models/Fahrt');
const { getDistance, calculateAutoSplit } = require('../utils/distanceCalculator');

exports.createFahrt = async (req, res) => {
  try {
    console.log('Received fahrt data:', req.body);
    const { 
      vonOrtId, 
      nachOrtId, 
      datum, 
      anlass, 
      kilometer, 
      autosplit, 
      abrechnung,
      einmaligerVonOrt,
      einmaligerNachOrt
    } = req.body;
    const userId = req.user.id;
    
    let details = [];
    let gesamtKilometer = kilometer;
    
    if (autosplit) {
      const splitResult = await calculateAutoSplit(vonOrtId, nachOrtId, userId);
      gesamtKilometer = splitResult.kirchenkreis + splitResult.gemeinde;
      
      if (splitResult.kirchenkreis > 0) {
        details.push({
          vonOrtId: splitResult.kirchenkreisVonOrtId,
          nachOrtId: splitResult.kirchenkreisNachOrtId,
          kilometer: splitResult.kirchenkreis,
          abrechnung: 'Kirchenkreis'
        });
      }
      
      if (splitResult.gemeinde > 0) {
        details.push({
          vonOrtId: splitResult.gemeindeVonOrtId,
          nachOrtId: splitResult.gemeindeNachOrtId,
          kilometer: splitResult.gemeinde,
          abrechnung: 'Gemeinde'
        });
      }
    } else if (!gesamtKilometer && !einmaligerVonOrt && !einmaligerNachOrt) {
      gesamtKilometer = await getDistance(vonOrtId, nachOrtId, userId);
    }
    
    const fahrtData = {
      datum,
      anlass,
      autosplit: autosplit || false,
      kilometer: gesamtKilometer,
      abrechnung: autosplit ? 'Autosplit' : (abrechnung || 'Gemeinde'),
      vonOrtId,
      nachOrtId,
      einmaligerVonOrt,
      einmaligerNachOrt
    };
    
    console.log('Processed fahrt data:', fahrtData);
    console.log('Details for autosplit:', details);
    
    const id = await Fahrt.create(fahrtData, details, userId);
    res.status(201).json({ id, message: 'Fahrt erfolgreich erstellt' });
  } catch (error) {
    console.error('Fehler beim Erstellen der Fahrt:', error);
    res.status(500).json({ message: 'Fehler beim Erstellen der Fahrt', error: error.message });
  }
};

exports.updateFahrt = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      vonOrtId, 
      nachOrtId, 
      einmaligerVonOrt,
      einmaligerNachOrt,
      anlass, 
      kilometer, 
      manuelleKilometer, 
      abrechnung, 
      autosplit, 
      datum 
    } = req.body;
    const userId = req.user.id;
    
    console.log('Received update data:', req.body);
    
    let updatedKilometer = kilometer;
    if (autosplit && vonOrtId && nachOrtId) {
      const splitResult = await calculateAutoSplit(vonOrtId, nachOrtId);
      updatedKilometer = splitResult.gesamt;
    } else if (manuelleKilometer != null) {
      updatedKilometer = manuelleKilometer;
    }
    
    const updateData = {
      vonOrtId: vonOrtId || null,
      nachOrtId: nachOrtId || null,
      einmaligerVonOrt: einmaligerVonOrt || null,
      einmaligerNachOrt: einmaligerNachOrt || null,
      anlass: anlass || null,
      kilometer: updatedKilometer != null ? parseFloat(updatedKilometer) : null,
      manuelleKilometer: manuelleKilometer != null ? parseFloat(manuelleKilometer) : null,
      abrechnung: abrechnung || null,
      autosplit: autosplit ? 1 : 0,
      datum: datum || null
    };
    
    console.log('Processed update data:', updateData);
    
    const updated = await Fahrt.update(id, updateData, userId);
    if (updated) {
      res.status(200).json({ message: 'Fahrt erfolgreich aktualisiert' });
    } else {
      res.status(404).json({ message: 'Fahrt nicht gefunden' });
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Fahrt:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren der Fahrt', error: error.message });
  }
};

exports.getAllFahrten = async (req, res) => {
  try {
    const userId = req.user.id;
    const fahrten = await Fahrt.findAll(userId);
    res.status(200).json(fahrten);
  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Abrufen der Fahrten', error: error.message });
  }
};

exports.getFahrtById = async (req, res) => {
  try {
    const userId = req.user.id;
    const fahrt = await Fahrt.findById(req.params.id, userId);
    if (fahrt) {
      res.status(200).json(fahrt);
    } else {
      res.status(404).json({ message: 'Fahrt nicht gefunden' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Abrufen der Fahrt', error: error.message });
  }
};

exports.deleteFahrt = async (req, res) => {
  try {
    const userId = req.user.id;
    const deleted = await Fahrt.delete(req.params.id, userId);
    if (deleted) {
      res.status(200).json({ message: 'Fahrt erfolgreich gelöscht' });
    } else {
      res.status(404).json({ message: 'Fahrt nicht gefunden' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Löschen der Fahrt', error: error.message });
  }
};

exports.getMonthlyReport = async (req, res) => {
  try {
    const year = parseInt(req.params.year) || null;
    const month = parseInt(req.params.month) || null;
    const userId = req.user.id;
    
    if (year === null || month === null) {
      return res.status(400).json({ message: 'Ungültiges Jahr oder Monat' });
    }
    
    const fahrten = await Fahrt.getMonthlyReport(year, month, userId);
    
    const erstattungssatz = 0.30;  // 0,30 € pro km
    let kirchenkreisSum = 0;
    let gemeindeSum = 0;
    
    const report = fahrten.map((fahrt) => {
      let kirchenkreisKm = 0;
      let gemeindeKm = 0;
      
      if (fahrt.autosplit) {
        fahrt.details.forEach(detail => {
          if (detail.abrechnung === 'Kirchenkreis') {
            kirchenkreisKm += detail.kilometer;
          } else {
            gemeindeKm += detail.kilometer;
          }
        });
      } else if (fahrt.abrechnung === 'Kirchenkreis') {
        kirchenkreisKm = fahrt.kilometer;
      } else if (fahrt.abrechnung === 'Gemeinde') {
        gemeindeKm = fahrt.kilometer;
      }
      
      kirchenkreisSum += kirchenkreisKm * erstattungssatz;
      gemeindeSum += gemeindeKm * erstattungssatz;
      
      return {
        ...fahrt,
        vonOrtName: fahrt.von_ort_name || fahrt.einmaliger_von_ort,
        nachOrtName: fahrt.nach_ort_name || fahrt.einmaliger_nach_ort,
        kirchenkreisKm,
        gemeindeKm,
        kirchenkreisErstattung: kirchenkreisKm * erstattungssatz,
        gemeindeErstattung: gemeindeKm * erstattungssatz
      };
    });
    
    res.status(200).json({
      fahrten: report,
      summary: {
        kirchenkreisErstattung: kirchenkreisSum,
        gemeindeErstattung: gemeindeSum,
        gesamtErstattung: kirchenkreisSum + gemeindeSum
      }
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Monatsberichts:', error);
    res.status(500).json({ message: 'Fehler beim Erstellen des Monatsberichts', error: error.message });
  }
};

exports.getMonthlySummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const summary = await Fahrt.getMonthlySummary(userId);
    if (!summary || summary.length === 0) {
      return res.status(404).json({ message: 'Keine Daten für die monatliche Zusammenfassung gefunden' });
    }
    res.status(200).json(summary);
  } catch (error) {
    console.error('Fehler beim Abrufen der monatlichen Zusammenfassung:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der monatlichen Zusammenfassung', error: error.message });
  }
};


exports.getYearSummary = async (req, res) => {
  try {
    const { year } = req.params;
    const userId = req.user.id;
    const summary = await Fahrt.getYearSummary(year, userId);
    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Abrufen der Jahreszusammenfassung', error: error.message });
  }
};

module.exports = exports;