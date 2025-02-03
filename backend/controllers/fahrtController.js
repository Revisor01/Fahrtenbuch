const Fahrt = require('../models/Fahrt');
const Mitfahrer = require('../models/Mitfahrer');
const Abrechnung = require('../models/Abrechnung');
const { getDistance, calculateAutoSplit } = require('../utils/distanceCalculator');
const ExcelJS = require('exceljs');
const path = require('path');
const JSZip = require('jszip');
const { exportToExcel } = require('../utils/excelExport');

exports.exportToExcel = exportToExcel;

exports.createFahrt = async (req, res) => {
  try {
    console.log('Received fahrt data:', req.body);
    const { 
      vonOrtId, 
      nachOrtId, 
      datum, 
      anlass, 
      kilometer, 
      abrechnung,
      einmaligerVonOrt,
      einmaligerNachOrt,
      mitfahrer
    } = req.body;
    const userId = req.user.id;
    
    const fahrtData = {
      datum,
      anlass,
      kilometer,
      abrechnung,
      vonOrtId: vonOrtId || null,
      nachOrtId: nachOrtId || null,
      einmaligerVonOrt: einmaligerVonOrt || null,
      einmaligerNachOrt: einmaligerNachOrt || null
    };
    
    console.log('Processed fahrt data:', fahrtData);
    
    const id = await Fahrt.create(fahrtData, null, userId);
    if (mitfahrer && mitfahrer.length > 0) {
      for (const person of mitfahrer) {
        await Mitfahrer.create(id, person.name, person.arbeitsstaette, person.richtung);
      }
    }
    
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
      datum,
      mitfahrer
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
      // Lösche vorhandene Mitfahrer und füge neue hinzu
      await Mitfahrer.deleteByFahrtId(id);
      if (mitfahrer && mitfahrer.length > 0) {
        for (const person of mitfahrer) {
          await Mitfahrer.create(id, person.name, person.arbeitsstaette, person.richtung);
        }
      }
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
      const mitfahrer = await Mitfahrer.findByFahrtId(fahrt.id);
      res.status(200).json({ ...fahrt, mitfahrer });
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
    
    // Hole Fahrten und Abrechnungsstatus parallel
    const [fahrten, abrechnungsStatus] = await Promise.all([
      Fahrt.getMonthlyReport(year, month, userId),
      Abrechnung.getStatus(userId, year, month)
    ]);
    
    // Füge Mitfahrer-Daten hinzu
    for (let fahrt of fahrten) {
      fahrt.mitfahrer = await Mitfahrer.findByFahrtId(fahrt.id);
    }
    
    const erstattungssatz = 0.30;
    let kirchenkreisSum = 0;
    let gemeindeSum = 0;
    let mitfahrerSum = 0;
    
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
      
      // Mitfahrer-Summe immer berechnen
      if (fahrt.mitfahrer && fahrt.mitfahrer.length > 0) {
        mitfahrerSum += fahrt.mitfahrer.length * 0.05 * fahrt.kilometer;
      }
      
      // Immer die Summen berechnen, unabhängig vom Status
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
        mitfahrerErstattung: mitfahrerSum,
        gesamtErstattung: kirchenkreisSum + gemeindeSum + mitfahrerSum,
        abrechnungsStatus: {
          kirchenkreis: abrechnungsStatus.find(s => s.typ === 'Kirchenkreis'),
          gemeinde: abrechnungsStatus.find(s => s.typ === 'Gemeinde')
        }
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

exports.addMitfahrer = async (req, res) => {
  try {
    const { fahrtId } = req.params;
    const { name, arbeitsstaette, richtung } = req.body;
    const mitfahrerId = await Mitfahrer.create(fahrtId, name, arbeitsstaette, richtung);
    res.status(201).json({ id: mitfahrerId, message: 'Mitfahrer erfolgreich hinzugefügt' });
  } catch (error) {
    console.error('Fehler beim Hinzufügen des Mitfahrers:', error);
    res.status(500).json({ message: 'Fehler beim Hinzufügen des Mitfahrers', error: error.message });
  }
};

exports.updateMitfahrer = async (req, res) => {
  try {
    const { fahrtId, mitfahrerId } = req.params;
    const { name, arbeitsstaette, richtung } = req.body;
    const updated = await Mitfahrer.update(mitfahrerId, name, arbeitsstaette, richtung);
    if (updated) {
      res.status(200).json({ message: 'Mitfahrer erfolgreich aktualisiert' });
    } else {
      res.status(404).json({ message: 'Mitfahrer nicht gefunden' });
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Mitfahrers:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren des Mitfahrers', error: error.message });
  }
};

exports.deleteMitfahrer = async (req, res) => {
  try {
    const { fahrtId, mitfahrerId } = req.params;
    const deleted = await Mitfahrer.delete(mitfahrerId);
    if (deleted) {
      res.status(200).json({ message: 'Mitfahrer erfolgreich gelöscht' });
    } else {
      res.status(404).json({ message: 'Mitfahrer nicht gefunden' });
    }
  } catch (error) {
    console.error('Fehler beim Löschen des Mitfahrers:', error);
    res.status(500).json({ message: 'Fehler beim Löschen des Mitfahrers', error: error.message });
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

exports.updateAbrechnungsStatus = async (req, res) => {
  try {
    const { jahr, monat, typ, aktion, datum } = req.body;
    const userId = req.user.id;
    
    const result = await Abrechnung.updateStatus(userId, jahr, monat, typ, aktion, datum);
    
    res.status(200).json({
      message: `Abrechnungsstatus erfolgreich aktualisiert`,
      result
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Abrechnungsstatus:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren des Status', error: error.message });
  }
};

module.exports = exports;