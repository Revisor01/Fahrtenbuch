const ExcelJS = require('exceljs');
const path = require('path');
const JSZip = require('jszip');
const Fahrt = require('../models/Fahrt');
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
         vorlageWorksheet.getCell('C7').value = "Mitfahrer:innen";
         vorlageWorksheet.getCell('C11').value = userProfile.full_name;
         vorlageWorksheet.getCell('C12').value = userProfile.home_address;
         vorlageWorksheet.getCell('C13').value = formatIBAN(userProfile.iban);
      }

     const mitnahmeWorksheet = workbook.getWorksheet('Mitnahmeentschädigung');
     if(mitnahmeWorksheet) {
         mitnahmeWorksheet.getCell('B2').value = `${getMonthName(parseInt(correctedMonth))} ${year}`;

            
       uniqueMitfahrerData.forEach((mitfahrer, index) => {
         if (index < 15) {
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
   
   const chunkedData = [];
   for (let i = 0; i < formattedData.length; i += 22) {
     chunkedData.push(formattedData.slice(i, i + 22));
   }
   
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

   if (formattedData.length === 0) {
     return res.status(404).json({ message: 'Keine Daten für den ausgewählten Zeitraum und Typ gefunden.' });
   }
   
   const templatePath = path.join(__dirname, '..', 'templates', 'fahrtenabrechnung_vorlage.xlsx');
   
   const workbooks = await Promise.all(chunkedData.map(async (chunk, index) => {
     const workbook = new ExcelJS.Workbook();
     await workbook.xlsx.readFile(templatePath);
     
      const vorlageWorksheet = workbook.getWorksheet('Vorlage');
      if (vorlageWorksheet) {
         const [abrechnungstraeger] = await db.execute(
            'SELECT name FROM abrechnungstraeger WHERE id = ? AND user_id = ?',
            [type, userId]
         );
         vorlageWorksheet.getCell('C7').value = abrechnungstraeger[0]?.name;
         vorlageWorksheet.getCell('C11').value = userProfile.full_name;
         vorlageWorksheet.getCell('C12').value = userProfile.home_address;
         vorlageWorksheet.getCell('C13').value = formatIBAN(userProfile.iban);
      }
     
     const abrechnungWorksheet = workbook.getWorksheet('monatliche Abrechnung');
     if (abrechnungWorksheet) {
       abrechnungWorksheet.getCell('B2').value = `${getMonthName(parseInt(correctedMonth))} ${year}`;
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