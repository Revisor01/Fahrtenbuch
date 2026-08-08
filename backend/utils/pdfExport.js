const JSZip = require('jszip');
const { baueMonatsWorkbooks, baueZeitraumWorkbooks } = require('./excelExport');
const { convertXlsxBufferToPdf } = require('./xlsxToPdf');

// Der PDF-Export baut exakt dieselben Arbeitsmappen wie der Excel-Export und
// lässt sie von LibreOffice headless nach PDF wandeln. Das Ergebnis entspricht
// damit dem Ausdruck der Excel-Datei — das offizielle Formular bleibt die
// einzige Layout-Wahrheit.

// Nicht befüllte Formularblätter (z. B. die Mitnahmeentschädigung beim normalen
// Abrechnungsexport) würden als leere Seite mitgedruckt. In der Excel-Datei
// bleiben sie erhalten — im PDF, das zum Drucken gedacht ist, fliegen sie raus.
// Der Datenbereich endet vor der statischen Fußzeile des Formulars
// (ab Zeile 39: "Gesamt:", Hinweise, Unterschriftszeilen).
const OPTIONALE_BLAETTER = [
 { name: 'Mitnahmeentschädigung', ersteZeile: 10, letzteZeile: 38, spalten: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] }
];

function entferneLeereBlaetter(workbook) {
 OPTIONALE_BLAETTER.forEach(({ name, ersteZeile, letzteZeile, spalten }) => {
   const ws = workbook.getWorksheet(name);
   if (!ws) return;

   let hatDaten = false;
   for (let r = ersteZeile; r <= letzteZeile && !hatDaten; r++) {
     const row = ws.getRow(r);
     for (const spalte of spalten) {
       const v = row.getCell(spalte).value;
       if (v !== null && v !== undefined && String(v).trim() !== '') {
         hatDaten = true;
         break;
       }
     }
   }

   if (!hatDaten) workbook.removeWorksheet(ws.id);
 });
}

async function sendePdfAntwort(res, ergebnis) {
 const files = [];
 for (const { dateiname, workbook } of ergebnis.dateien) {
   entferneLeereBlaetter(workbook);
   const xlsxBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
   // Der Dateiname landet über die Kopf-/Fußzeile des Formulars (&F) im PDF —
   // deshalb den echten Exportnamen und keinen Zufallsnamen verwenden.
   const pdfBuffer = await convertXlsxBufferToPdf(xlsxBuffer, dateiname);
   files.push({ fileName: `${dateiname}.pdf`, buffer: pdfBuffer });
 }

 if (files.length === 1) {
   res.setHeader('Content-Type', 'application/pdf');
   res.setHeader('Content-Disposition', `attachment; filename=${files[0].fileName}`);
   return res.send(files[0].buffer);
 }

 const zip = new JSZip();
 files.forEach(file => {
   zip.file(file.fileName, file.buffer);
 });

 const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

 res.setHeader('Content-Type', 'application/zip');
 res.setHeader('Content-Disposition', `attachment; filename=${ergebnis.zipName}.zip`);
 res.send(zipBuffer);
}

exports.exportToPdf = async (req, res) => {
 try {
   const { year, month, type } = req.params;
   const ergebnis = await baueMonatsWorkbooks({ year, month, type, userId: req.user.id });

   if (ergebnis.notFound) {
     return res.status(404).json({ message: 'Keine Daten für den ausgewählten Zeitraum und Typ gefunden.' });
   }

   return await sendePdfAntwort(res, ergebnis);
 } catch (error) {
   console.error('Fehler beim PDF-Export:', error);
   if (!res.headersSent) {
     res.status(500).json({ message: 'Fehler beim PDF-Export', error: error.message });
   }
 }
};

exports.exportToPdfRange = async (req, res) => {
 try {
   const { startYear, startMonth, endYear, endMonth, type } = req.params;
   const ergebnis = await baueZeitraumWorkbooks({
     startYear, startMonth, endYear, endMonth, type, userId: req.user.id
   });

   if (ergebnis.notFound) {
     return res.status(404).json({ message: 'Keine Daten für den ausgewählten Zeitraum und Typ gefunden.' });
   }

   return await sendePdfAntwort(res, ergebnis);
 } catch (error) {
   console.error('Fehler beim PDF-Export (Range):', error);
   if (!res.headersSent) {
     res.status(500).json({ message: 'Fehler beim PDF-Export', error: error.message });
   }
 }
};
