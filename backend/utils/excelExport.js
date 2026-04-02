const ExcelJS = require('exceljs');
const path = require('path');
const JSZip = require('jszip');
const Fahrt = require('../models/Fahrt');
const Abrechnung = require('../models/Abrechnung');
const db = require('../config/database');

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

function formatDate(dateString) {
 const date = new Date(dateString);
 const day = date.getDate().toString().padStart(2, '0');
 const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
 const monthName = monthNames[date.getMonth()];
 return `${day}. ${monthName}`;
}

const QUARTAL_SHEETS = [
 'Januar-März',
 'April-Juni',
 'Juli-September',
 'Oktober-Dezember'
];

function getQuartalSheet(month) {
 const m = parseInt(month);
 if (m >= 1 && m <= 3) return QUARTAL_SHEETS[0];
 if (m >= 4 && m <= 6) return QUARTAL_SHEETS[1];
 if (m >= 7 && m <= 9) return QUARTAL_SHEETS[2];
 return QUARTAL_SHEETS[3];
}

// Max data rows per quartal sheet (rows 8-36)
const MAX_ROWS_PER_SHEET = 29;

function fillVorlageSheet(worksheet, year, kostentraeger, kostenstelle, userProfile) {
 worksheet.getCell('C7').value = parseInt(year);
 worksheet.getCell('C8').value = kostenstelle
   ? `${kostentraeger} - Kst.: ${kostenstelle}`
   : kostentraeger;
 worksheet.getCell('C12').value = userProfile.full_name;
 worksheet.getCell('C13').value = userProfile.home_address;
 worksheet.getCell('C14').value = formatIBAN(userProfile.iban);
}

function fillQuartalSheet(worksheet, data, year) {
 // Update year
 worksheet.getCell('B2').value = parseInt(year);

 // Fill data rows (starting at row 8, max 29 rows)
 // Only set values — styles are already correct in the template
 data.forEach((row, rowIndex) => {
   if (rowIndex >= MAX_ROWS_PER_SHEET) return;
   const excelRow = worksheet.getRow(rowIndex + 8);

   excelRow.getCell('A').value = row.datum;
   excelRow.getCell('A').numFmt = 'DD.MM.YYYY';
   excelRow.getCell('B').value = row.vonOrt;
   excelRow.getCell('F').value = row.nachOrt;
   excelRow.getCell('H').value = row.anlass;
   excelRow.getCell('K').value = row.kilometer;
 });

 // Gesamt km in K37
 const gesamtKm = data.reduce((sum, row) => sum + (typeof row.kilometer === 'number' ? row.kilometer : 0), 0);
 worksheet.getCell('K37').value = gesamtKm;

 // Erstattungsberechnung in Zeile 40
 worksheet.getCell('H40').value = gesamtKm;
 worksheet.getCell('J40').value = Math.round(gesamtKm * 0.30 * 100) / 100;
}

function removeUnusedQuartalSheets(workbook, keepSheetName) {
 // Remove quartal sheets we don't need
 QUARTAL_SHEETS.forEach(name => {
   if (name !== keepSheetName) {
     const ws = workbook.getWorksheet(name);
     if (ws) workbook.removeWorksheet(ws.id);
   }
 });
}

exports.exportToExcel = async (req, res) => {
 try {
   const { year, month, type } = req.params;
   const userId = req.user.id;

   const correctedMonth = month.split('-')[1] || month;

   const fahrten = await Fahrt.getMonthlyReport(year, correctedMonth, userId);

   const userProfile = await getUserProfile(userId);

   if(type === 'mitfahrer') {
      const mitfahrerData = fahrten.map(fahrt => {
         if (fahrt.mitfahrer_id) {
            return {
               datum: formatDate(fahrt.datum),
               anlass: fahrt.anlass,
               name: fahrt.mitfahrer_name,
               arbeitsstaette: fahrt.arbeitsstaette,
               hinweg: fahrt.richtung === 'hin' || fahrt.richtung === 'hin_rueck' ?
               `${fahrt.von_ort_name}-${fahrt.nach_ort_name}` : '',
               rueckweg: fahrt.richtung === 'rueck' || fahrt.richtung === 'hin_rueck' ?
               `${fahrt.nach_ort_name}-${fahrt.von_ort_name}` : '',
               kilometer: Math.round(parseFloat(fahrt.kilometer))
            };
         }
         return null;
      }).filter(Boolean);

      // Duplikate entfernen
      const uniqueMitfahrerData = mitfahrerData.filter((mitfahrer, index, self) =>
         index === self.findIndex((t) => t.datum === mitfahrer.datum && t.name === mitfahrer.name)
      );

     const templatePath = path.join(__dirname, '..', 'templates', 'fahrtenabrechnung_vorlage.xlsx');
     const workbook = new ExcelJS.Workbook();
     await workbook.xlsx.readFile(templatePath);

      const vorlageWorksheet = workbook.getWorksheet('Vorlage');
      if(vorlageWorksheet) {
         vorlageWorksheet.getCell('C7').value = parseInt(year);
         vorlageWorksheet.getCell('C8').value = "Mitfahrer:innen";
         vorlageWorksheet.getCell('C12').value = userProfile.full_name;
         vorlageWorksheet.getCell('C13').value = userProfile.home_address;
         vorlageWorksheet.getCell('C14').value = formatIBAN(userProfile.iban);
      }

      // Remove all quartal sheets for mitfahrer export
      QUARTAL_SHEETS.forEach(name => {
        const ws = workbook.getWorksheet(name);
        if (ws) workbook.removeWorksheet(ws.id);
      });

     const mitnahmeWorksheet = workbook.getWorksheet('Mitnahmeentschädigung');
     if(mitnahmeWorksheet) {
         mitnahmeWorksheet.getCell('B2').value = parseInt(year);
         mitnahmeWorksheet.getCell('D2').value = `${getMonthName(parseInt(correctedMonth))} ${year}`;

       uniqueMitfahrerData.forEach((mitfahrer, index) => {
         if (index < 29) {
           const row = mitnahmeWorksheet.getRow(index + 10);
           row.getCell('A').value = mitfahrer.datum;
           row.getCell('B').value = mitfahrer.anlass;
           row.getCell('C').value = mitfahrer.hinweg;
           row.getCell('D').value = mitfahrer.rueckweg;
           row.getCell('E').value = mitfahrer.name;
           row.getCell('F').value = mitfahrer.arbeitsstaette;
           row.getCell('G').value = mitfahrer.kilometer;

           ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
             const cell = row.getCell(col);
             cell.font = { name: 'Arial', size: 10 };
           });
         }
       });
     }

     const buffer = await workbook.xlsx.writeBuffer();
     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
     res.setHeader('Content-Disposition', `attachment; filename=mitfahrer_${year}_${correctedMonth}.xlsx`);
     return res.send(buffer);
   }

   // Normaler Export
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
     } else if (fahrt.abrechnung === type) {
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

   if (formattedData.length === 0) {
     return res.status(404).json({ message: 'Keine Daten für den ausgewählten Zeitraum und Typ gefunden.' });
   }

   // Chunk data into groups of MAX_ROWS_PER_SHEET (29)
   const chunkedData = [];
   for (let i = 0; i < formattedData.length; i += MAX_ROWS_PER_SHEET) {
     chunkedData.push(formattedData.slice(i, i + MAX_ROWS_PER_SHEET));
   }

   const quartalSheetName = getQuartalSheet(correctedMonth);
   const templatePath = path.join(__dirname, '..', 'templates', 'fahrtenabrechnung_vorlage.xlsx');

   const [abrechnungstraeger] = await db.execute(
     'SELECT name, kostenstelle FROM abrechnungstraeger WHERE id = ? AND user_id = ?',
     [type, userId]
   );
   const traegerName = abrechnungstraeger[0]?.name || '';
   const kostenstelle = abrechnungstraeger[0]?.kostenstelle;

   const workbooks = await Promise.all(chunkedData.map(async (chunk) => {
     const workbook = new ExcelJS.Workbook();
     await workbook.xlsx.readFile(templatePath);

     const vorlageWorksheet = workbook.getWorksheet('Vorlage');
     if (vorlageWorksheet) {
       fillVorlageSheet(vorlageWorksheet, year, traegerName, kostenstelle, userProfile);
     }

     // Remove unused quartal sheets, keep only the relevant one
     removeUnusedQuartalSheets(workbook, quartalSheetName);

     const quartalWorksheet = workbook.getWorksheet(quartalSheetName);
     if (quartalWorksheet) {
       // Set month name in D2
       quartalWorksheet.getCell('D2').value = getMonthName(parseInt(correctedMonth));
       fillQuartalSheet(quartalWorksheet, chunk, year);
     }

     return workbook;
   }));

   const files = await Promise.all(workbooks.map(async (wb, index) => {
     const fileName = `fahrtenabrechnung_${type}_${year}_${correctedMonth}_${index + 1}.xlsx`;
     const buffer = await wb.xlsx.writeBuffer();
     return { fileName, buffer };
   }));

   if (files.length === 1) {
     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
     res.setHeader('Content-Disposition', `attachment; filename=${files[0].fileName}`);
     return res.send(files[0].buffer);
   }

   const zip = new JSZip();
   files.forEach(file => {
     zip.file(file.fileName, file.buffer);
   });

   const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

   res.setHeader('Content-Type', 'application/zip');
   res.setHeader('Content-Disposition', `attachment; filename=fahrtenabrechnung_${type}_${year}_${correctedMonth}.zip`);
   res.send(zipBuffer);

 } catch (error) {
   console.error('Fehler beim Exportieren nach Excel:', error);
   res.status(500).json({ message: 'Fehler beim Exportieren nach Excel', error: error.message });
 }
};

exports.exportToExcelRange = async (req, res) => {
 try {
   const { startYear, startMonth, endYear, endMonth, type } = req.params;
   const userId = req.user.id;

   const fahrten = await Fahrt.getDateRangeReport(startYear, startMonth, endYear, endMonth, userId);

   const userProfile = await getUserProfile(userId);

   // Determine header time range
   const isSingleMonth = startYear === endYear && startMonth === endMonth;
   const zeitraumHeader = isSingleMonth
     ? getMonthName(parseInt(startMonth))
     : `${String(startMonth).padStart(2, '0')}/${startYear} - ${String(endMonth).padStart(2, '0')}/${endYear}`;

   if (type === 'mitfahrer') {
     const mitfahrerData = fahrten.map(fahrt => {
       if (fahrt.mitfahrer_id) {
         return {
           datum: formatDate(fahrt.datum),
           anlass: fahrt.anlass,
           name: fahrt.mitfahrer_name,
           arbeitsstaette: fahrt.arbeitsstaette,
           hinweg: fahrt.richtung === 'hin' || fahrt.richtung === 'hin_rueck' ?
             `${fahrt.von_ort_name}-${fahrt.nach_ort_name}` : '',
           rueckweg: fahrt.richtung === 'rueck' || fahrt.richtung === 'hin_rueck' ?
             `${fahrt.nach_ort_name}-${fahrt.von_ort_name}` : '',
           kilometer: Math.round(parseFloat(fahrt.kilometer))
         };
       }
       return null;
     }).filter(Boolean);

     const uniqueMitfahrerData = mitfahrerData.filter((mitfahrer, index, self) =>
       index === self.findIndex((t) => t.datum === mitfahrer.datum && t.name === mitfahrer.name)
     );

     const templatePath = path.join(__dirname, '..', 'templates', 'fahrtenabrechnung_vorlage.xlsx');
     const workbook = new ExcelJS.Workbook();
     await workbook.xlsx.readFile(templatePath);

     const vorlageWorksheet = workbook.getWorksheet('Vorlage');
     if (vorlageWorksheet) {
       vorlageWorksheet.getCell('C7').value = parseInt(startYear);
       vorlageWorksheet.getCell('C8').value = "Mitfahrer:innen";
       vorlageWorksheet.getCell('C12').value = userProfile.full_name;
       vorlageWorksheet.getCell('C13').value = userProfile.home_address;
       vorlageWorksheet.getCell('C14').value = formatIBAN(userProfile.iban);
     }

     // Remove all quartal sheets for mitfahrer export
     QUARTAL_SHEETS.forEach(name => {
       const ws = workbook.getWorksheet(name);
       if (ws) workbook.removeWorksheet(ws.id);
     });

     const mitnahmeWorksheet = workbook.getWorksheet('Mitnahmeentschädigung');
     if (mitnahmeWorksheet) {
       mitnahmeWorksheet.getCell('B2').value = parseInt(startYear);
       mitnahmeWorksheet.getCell('D2').value = zeitraumHeader;

       uniqueMitfahrerData.forEach((mitfahrer, index) => {
         if (index < 29) {
           const row = mitnahmeWorksheet.getRow(index + 10);
           row.getCell('A').value = mitfahrer.datum;
           row.getCell('B').value = mitfahrer.anlass;
           row.getCell('C').value = mitfahrer.hinweg;
           row.getCell('D').value = mitfahrer.rueckweg;
           row.getCell('E').value = mitfahrer.name;
           row.getCell('F').value = mitfahrer.arbeitsstaette;
           row.getCell('G').value = mitfahrer.kilometer;

           ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
             const cell = row.getCell(col);
             cell.font = { name: 'Arial', size: 10 };
           });
         }
       });
     }

     // Status-Update für jeden Monat im Zeitraum
     let y = parseInt(startYear), m = parseInt(startMonth);
     const ey = parseInt(endYear), em = parseInt(endMonth);
     while (y < ey || (y === ey && m <= em)) {
       await Abrechnung.updateStatus(userId, y, m, type, 'eingereicht', new Date().toISOString().slice(0, 10));
       m++;
       if (m > 12) { m = 1; y++; }
     }

     const buffer = await workbook.xlsx.writeBuffer();
     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
     res.setHeader('Content-Disposition', `attachment; filename=mitfahrer_${startYear}_${startMonth}_bis_${endYear}_${endMonth}.xlsx`);
     return res.send(buffer);
   }

   // Normaler Export für andere Typen
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
     } else if (fahrt.abrechnung === type) {
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

   if (formattedData.length === 0) {
     return res.status(404).json({ message: 'Keine Daten für den ausgewählten Zeitraum und Typ gefunden.' });
   }

   // Chunk data into groups of MAX_ROWS_PER_SHEET (29)
   const chunkedData = [];
   for (let i = 0; i < formattedData.length; i += MAX_ROWS_PER_SHEET) {
     chunkedData.push(formattedData.slice(i, i + MAX_ROWS_PER_SHEET));
   }

   const quartalSheetName = getQuartalSheet(startMonth);
   const templatePath = path.join(__dirname, '..', 'templates', 'fahrtenabrechnung_vorlage.xlsx');

   const [abrechnungstraeger] = await db.execute(
     'SELECT name, kostenstelle FROM abrechnungstraeger WHERE id = ? AND user_id = ?',
     [type, userId]
   );
   const traegerName = abrechnungstraeger[0]?.name || '';
   const kostenstelle = abrechnungstraeger[0]?.kostenstelle;

   const workbooks = await Promise.all(chunkedData.map(async (chunk) => {
     const workbook = new ExcelJS.Workbook();
     await workbook.xlsx.readFile(templatePath);

     const vorlageWorksheet = workbook.getWorksheet('Vorlage');
     if (vorlageWorksheet) {
       fillVorlageSheet(vorlageWorksheet, startYear, traegerName, kostenstelle, userProfile);
     }

     // Remove unused quartal sheets, keep only the relevant one
     removeUnusedQuartalSheets(workbook, quartalSheetName);

     const quartalWorksheet = workbook.getWorksheet(quartalSheetName);
     if (quartalWorksheet) {
       quartalWorksheet.getCell('D2').value = zeitraumHeader;
       fillQuartalSheet(quartalWorksheet, chunk, startYear);
     }

     return workbook;
   }));

   // Status-Update für jeden Monat im Zeitraum
   let y = parseInt(startYear), m = parseInt(startMonth);
   const ey = parseInt(endYear), em = parseInt(endMonth);
   while (y < ey || (y === ey && m <= em)) {
     await Abrechnung.updateStatus(userId, y, m, type, 'eingereicht', new Date().toISOString().slice(0, 10));
     m++;
     if (m > 12) { m = 1; y++; }
   }

   const files = await Promise.all(workbooks.map(async (wb, index) => {
     const fileName = `fahrtenabrechnung_${type}_${startYear}_${startMonth}_bis_${endYear}_${endMonth}_${index + 1}.xlsx`;
     const buffer = await wb.xlsx.writeBuffer();
     return { fileName, buffer };
   }));

   if (files.length === 1) {
     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
     res.setHeader('Content-Disposition', `attachment; filename=${files[0].fileName}`);
     return res.send(files[0].buffer);
   }

   const zip = new JSZip();
   files.forEach(file => {
     zip.file(file.fileName, file.buffer);
   });

   const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

   res.setHeader('Content-Type', 'application/zip');
   res.setHeader('Content-Disposition', `attachment; filename=fahrtenabrechnung_${type}_${startYear}_${startMonth}_bis_${endYear}_${endMonth}.zip`);
   res.send(zipBuffer);

 } catch (error) {
   console.error('Fehler beim Exportieren nach Excel (Range):', error);
   res.status(500).json({ message: 'Fehler beim Exportieren nach Excel', error: error.message });
 }
};
