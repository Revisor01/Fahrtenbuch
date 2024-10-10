const ExcelJS = require('exceljs');
const path = require('path');
const JSZip = require('jszip');
const db = require('../config/database');
const Fahrt = require('../models/Fahrt');

async function getUserProfile(userId) {
  const [rows] = await db.execute(
    `SELECT p.*, o.adresse as home_address
     FROM user_profiles p
     LEFT JOIN orte o ON p.user_id = o.user_id AND o.ist_wohnort = 1
     WHERE p.user_id = ?`,
    [userId]
  );
  return rows[0];
}

function formatIBAN(iban) {
  if (!iban) return '';
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

function getMonthName(monthNumber) {
  const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return monthNames[monthNumber - 1];
}

function prepareMitfahrerData(fahrten) {
  const mitfahrerData = [];
  const processedMitfahrer = new Set();

  fahrten.forEach(fahrt => {
    if (fahrt.mitfahrer && fahrt.mitfahrer.length > 0) {
      fahrt.mitfahrer.forEach(mitfahrer => {
        const key = `${fahrt.datum}-${mitfahrer.name}-${mitfahrer.arbeitsstaette}`;
        if (!processedMitfahrer.has(key)) {
          processedMitfahrer.add(key);
          mitfahrerData.push({
            datum: fahrt.datum,
            anlass: fahrt.anlass,
            hinweg: mitfahrer.richtung === 'hin' || mitfahrer.richtung === 'hin_rueck',
            rueckweg: mitfahrer.richtung === 'rueck' || mitfahrer.richtung === 'hin_rueck',
            name: mitfahrer.name,
            arbeitsstaette: mitfahrer.arbeitsstaette,
            kilometer: mitfahrer.richtung === 'hin_rueck' ? fahrt.kilometer * 2 : fahrt.kilometer
          });
        }
      });
    }
  });

  return mitfahrerData;
}

async function exportToExcel(req, res) {
  try {
    const { year, month, type } = req.params;
    const userId = req.user.id;
    
    // Abrufen der Fahrten für den angegebenen Monat
    const fahrten = await Fahrt.getMonthlyReport(year, month, userId);
    
    // Abrufen des Benutzerprofils
    const userProfile = await getUserProfile(userId);
    
    // Funktion zur Formatierung des Datums
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
      const monthName = monthNames[date.getMonth()];
      return `${day}. ${monthName}`;
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
    
    // Mitfahrerdaten vorbereiten
    const mitfahrerData = prepareMitfahrerData(fahrten);
    
    // Pfad zur Vorlage
    const templatePath = path.join(__dirname, '..', 'templates', 'fahrtenabrechnung_vorlage.xlsx');
    
    // Erstellen der Workbooks basierend auf der Vorlage
    const workbooks = await Promise.all(chunkedData.map(async (chunk, index) => {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(templatePath);
      
      // Bearbeite das "Vorlage" Worksheet
      const vorlageWorksheet = workbook.getWorksheet('Vorlage');
      if (vorlageWorksheet) {
        vorlageWorksheet.getCell('C7').value = userProfile.kirchengemeinde;
        vorlageWorksheet.getCell('C11').value = userProfile.full_name;
        vorlageWorksheet.getCell('C12').value = userProfile.home_address;
        vorlageWorksheet.getCell('C13').value = formatIBAN(userProfile.iban);
      }
      
      // Bearbeite das "monatliche Abrechnung" Worksheet
      const abrechnungWorksheet = workbook.getWorksheet('monatliche Abrechnung');
      if (abrechnungWorksheet) {
        chunk.forEach((row, rowIndex) => {
          const excelRow = abrechnungWorksheet.getRow(rowIndex + 8);
          
          excelRow.getCell('A').value = row.formattedDatum;
          excelRow.getCell('E').value = row.vonOrt;
          excelRow.getCell('G').value = row.nachOrt;
          excelRow.getCell('H').value = row.anlass;
          excelRow.getCell('K').value = row.kilometer;
          
          ['A', 'E', 'G', 'H', 'K'].forEach(col => {
            const cell = excelRow.getCell(col);
            cell.style = { ...abrechnungWorksheet.getCell(`${col}8`).style };
            if (col === 'H') {
              cell.font = { ...cell.font, size: 10 };
            }
          });
        });
      }
      
      // Bearbeite das "Mitnahmeentschädigung" Worksheet
      const mitnahmeWorksheet = workbook.getWorksheet('Mitnahmeentschädigung');
      if (mitnahmeWorksheet) {
        mitnahmeWorksheet.getCell('B2').value = `${getMonthName(parseInt(month))} ${year}`;
        
        mitfahrerData.forEach((mitfahrer, index) => {
          if (index < 15) { // Maximal 15 Einträge (Zeile 10 bis 24)
            const row = mitnahmeWorksheet.getRow(index + 10);
            row.getCell('A').value = formatDate(mitfahrer.datum);
            row.getCell('B').value = mitfahrer.anlass;
            row.getCell('C').value = mitfahrer.hinweg ? 'x' : '';
            row.getCell('D').value = mitfahrer.rueckweg ? 'x' : '';
            row.getCell('E').value = mitfahrer.name;
            row.getCell('F').value = mitfahrer.arbeitsstaette;
            row.getCell('G').value = mitfahrer.kilometer;
          }
        });
      }
      
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
}

module.exports = { exportToExcel };