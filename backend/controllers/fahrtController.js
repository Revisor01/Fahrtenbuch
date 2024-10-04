const Fahrt = require('../models/Fahrt');
const { getDistance, calculateAutoSplit } = require('../utils/distanceCalculator');
const XLSX = require('xlsx');
const path = require('path');

exports.exportToExcel = async (req, res) => {
  try {
    const { year, month, type } = req.params;
    const userId = req.user.id;
    
    // Abrufen der Fahrten für den angegebenen Monat
    const fahrten = await Fahrt.getMonthlyReport(year, month, userId);
    
    // Filtern der Fahrten basierend auf dem Typ (Gemeinde oder Kirchenkreis)
    const filteredFahrten = fahrten.filter(fahrt => {
      if (type === 'gemeinde') {
        return fahrt.abrechnung === 'Gemeinde' || 
        (fahrt.autosplit && fahrt.details.some(detail => detail.abrechnung === 'Gemeinde'));
      } else if (type === 'kirchenkreis') {
        return fahrt.abrechnung === 'Kirchenkreis' || 
        (fahrt.autosplit && fahrt.details.some(detail => detail.abrechnung === 'Kirchenkreis'));
      }
    });
    
    // Formatieren der Daten für Excel
    const formattedData = filteredFahrten.flatMap(fahrt => {
      if (fahrt.autosplit) {
        return fahrt.details
        .filter(detail => detail.abrechnung === type)
        .map(detail => [
          new Date(fahrt.datum).toLocaleDateString('de-DE'),
          detail.von_ort_name,
          detail.nach_ort_name,
          fahrt.anlass,
          detail.kilometer
        ]);
      } else {
        return [[
          new Date(fahrt.datum).toLocaleDateString('de-DE'),
          fahrt.von_ort_name || fahrt.einmaliger_von_ort,
          fahrt.nach_ort_name || fahrt.einmaliger_nach_ort,
          fahrt.anlass,
          fahrt.kilometer
        ]];
      }
    });
    
    // Aufteilen der Daten in Gruppen von maximal 22 Zeilen (29 - 8 + 1)
    const chunkedData = [];
    for (let i = 0; i < formattedData.length; i += 22) {
      chunkedData.push(formattedData.slice(i, i + 22));
    }
    
    // Pfad zur Vorlage
    const templatePath = path.join(__dirname, '..', 'templates', 'fahrtenabrechnung_vorlage.xlsx');
    
    // Erstellen der Workbooks basierend auf der Vorlage
    const workbooks = chunkedData.map((chunk, index) => {
      // Lesen der Vorlage
      const workbook = XLSX.readFile(templatePath);
      
      // Überprüfen Sie, ob 'Blatt2' existiert, sonst verwenden Sie das erste verfügbare Blatt
      const sheetName = workbook.SheetNames.includes('Blatt2') ? 'Blatt2' : workbook.SheetNames[0];
      let worksheet = workbook.Sheets[sheetName];
      
      // Wenn das Arbeitsblatt nicht existiert, erstellen Sie ein neues
      if (!worksheet) {
        worksheet = XLSX.utils.aoa_to_sheet([]);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }
      
      // Einfügen der Daten in die Vorlage
      chunk.forEach((row, rowIndex) => {
        const [datum, vonOrt, nachOrt, anlass, kilometer] = row;
        XLSX.utils.sheet_add_aoa(worksheet, [[
          datum,
          ,,,, // Leere Zellen für B, C, D, E
          vonOrt,
          , // Leere Zelle für F
          nachOrt,
          anlass,
          ,, // Leere Zellen für I, J
          kilometer
        ]], { origin: `A${rowIndex + 8}` });
      });
      
      return workbook;
    });
    
    // Generieren der Excel-Dateien
    const files = workbooks.map((wb, index) => {
      const fileName = `fahrtenabrechnung_${type}_${year}_${month}_${index + 1}.xlsx`;
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return { fileName, buffer };
    });
    
    // Wenn nur eine Datei, senden Sie sie direkt
    if (files.length === 1) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${files[0].fileName}`);
      return res.send(files[0].buffer);
    }
    
    // Wenn mehrere Dateien, erstellen Sie ein Zip-Archiv
    const JSZip = require('jszip');
    const zip = new JSZip();
    
    files.forEach(file => {
      zip.file(file.fileName, file.buffer);
    });
    
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=fahrtenabrechnung_${type}_${year}_${month}.zip`);
    res.send(zipBuffer);
    
  } catch (error) {
    console.error('Fehler beim Exportieren nach Excel:', error);
    res.status(500).json({ message: 'Fehler beim Exportieren nach Excel', error: error.message });
  }
};

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