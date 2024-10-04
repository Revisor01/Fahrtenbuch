const Fahrt = require('../models/Fahrt');
const { getDistance, calculateAutoSplit } = require('../utils/distanceCalculator');
const ExcelJS = require('exceljs');
const path = require('path');
const JSZip = require('jszip');

exports.exportToExcel = async (req, res) => {
  try {
    const { year, month, type } = req.params;
    const userId = req.user.id;
    
    // Abrufen der Fahrten für den angegebenen Monat
    const fahrten = await Fahrt.getMonthlyReport(year, month, userId);
    
    // Funktion zur Formatierung des Datums
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const fullYear = date.getFullYear();
      return `${day}.${month}.${fullYear}`;
    };
    
    // Formatieren und Filtern der Daten für Excel
    const formattedData = fahrten.flatMap(fahrt => {
      if (fahrt.autosplit) {
        return fahrt.details
        .filter(detail => detail.abrechnung.toLowerCase() === type)
        .map(detail => ({
          datum: new Date(fahrt.datum),
          formattedDatum: formatDate(fahrt.datum),
          vonOrt: detail.von_ort_adresse || detail.von_ort_name,
          nachOrt: detail.nach_ort_adresse || detail.nach_ort_name,
          anlass: fahrt.anlass,
          kilometer: Math.round(detail.kilometer)
        }));
      } else if (fahrt.abrechnung.toLowerCase() === type) {
        return [{
          datum: new Date(fahrt.datum),
          formattedDatum: formatDate(fahrt.datum),
          vonOrt: fahrt.von_ort_adresse || fahrt.von_ort_name || fahrt.einmaliger_von_ort,
          nachOrt: fahrt.nach_ort_adresse || fahrt.nach_ort_name || fahrt.einmaliger_nach_ort,
          anlass: fahrt.anlass,
          kilometer: Math.round(fahrt.kilometer)
        }];
      }
      return [];
    }).sort((a, b) => a.datum - b.datum);
    
    // Aufteilen der Daten in Gruppen von genau 22 Zeilen
    const chunkedData = [];
    for (let i = 0; i < formattedData.length; i += 22) {
      chunkedData.push(formattedData.slice(i, i + 22));
    }
    
    // Wenn die letzte Gruppe weniger als 22 Einträge hat, fülle sie auf
    if (chunkedData.length > 0 && chunkedData[chunkedData.length - 1].length < 22) {
      const lastChunk = chunkedData[chunkedData.length - 1];
      while (lastChunk.length < 22) {
        lastChunk.push({
          formattedDatum: '',
          vonOrt: '',
          nachOrt: '',
          anlass: '',
          kilometer: ''
        });
      }
    }
    
    // Pfad zur Vorlage
    const templatePath = path.join(__dirname, '..', 'templates', 'fahrtenabrechnung_vorlage.xlsx');
    
    // Erstellen der Workbooks basierend auf der Vorlage
    const workbooks = await Promise.all(chunkedData.map(async (chunk, index) => {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(templatePath);
      
      const worksheet = workbook.getWorksheet('monatliche Abrechnung');
      
      if (!worksheet) {
        throw new Error('Worksheet "monatliche Abrechnung" nicht gefunden');
      }
      
      // Einfügen der Daten in die Vorlage
      chunk.forEach((row, rowIndex) => {
        const excelRow = worksheet.getRow(rowIndex + 8);
        
        // Datum einfügen und Formatierung beibehalten
        const dateCell = excelRow.getCell('A');
        dateCell.value = row.formattedDatum;
        dateCell.numFmt = dateCell.numFmt || 'dd.mm.yyyy'; // Behalte vorhandene Formatierung oder setze auf 'dd.mm.yyyy'
        
        excelRow.getCell('E').value = row.vonOrt;
        excelRow.getCell('G').value = row.nachOrt;
        excelRow.getCell('H').value = row.anlass;
        excelRow.getCell('K').value = row.kilometer;
        
        // Behalten Sie die Formatierung bei und setzen Sie die Schriftgröße für den Anlass
        ['A', 'E', 'G', 'H', 'K'].forEach(col => {
          const cell = excelRow.getCell(col);
          cell.style = { ...worksheet.getCell(`${col}8`).style };
          if (col === 'H') {
            cell.font = { ...cell.font, size: 10 };
          }
        });
      });
      
      return workbook;
    }));
    
    // Generieren der Excel-Dateien
    const files = await Promise.all(workbooks.map(async (wb, index) => {
      const fileName = `fahrtenabrechnung_${type}_${year}_${month}_${index + 1}.xlsx`;
      const buffer = await wb.xlsx.writeBuffer();
      return { fileName, buffer };
    }));
    
    // Wenn nur eine Datei, senden Sie sie direkt als XLSX
    if (files.length === 1) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${files[0].fileName}`);
      return res.send(files[0].buffer);
    }
    
    // Wenn mehrere Dateien, erstellen Sie ein Zip-Archiv
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