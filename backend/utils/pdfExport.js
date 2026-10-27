const { baueMonatsWorkbooks, baueZeitraumWorkbooks, markiereZeitraum } = require('./excelExport');
const { convertXlsxBufferToPdf } = require('./xlsxToPdf');

// Dieselben Mappen wie der Excel-Export, per LibreOffice nach PDF, damit das Formular die einzige Layout-Vorlage bleibt.

// Leere Formularblätter fliegen im PDF raus; der Datenbereich endet vor der Fußzeile ab Zeile 39.
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

// Mehrere Formularblätter werden Seiten einer PDF statt einer ZIP; der Excel-Export bleibt bei getrennten Dateien.
const BLAETTER_NUR_EINMAL = ['Vorlage', 'Mitnahmeentschädigung'];

// Tiefe Kopie mit echten Date-Werten, sonst bricht ExcelJS ab.
function klone(wert) {
 if (wert instanceof Date) return new Date(wert.getTime());
 if (Array.isArray(wert)) return wert.map(klone);
 if (wert && typeof wert === 'object') {
   return Object.fromEntries(Object.entries(wert).map(([k, v]) => [k, klone(v)]));
 }
 return wert;
}

function fuehreWorkbooksZusammen(dateien) {
 const [{ workbook: ziel }] = dateien;

 dateien.slice(1).forEach(({ workbook }) => {
   workbook.eachSheet((blatt) => {
     // Deckblatt und Mitnahmeentschädigung einmal, aufgeteilt werden nur die Quartalsblätter.
     if (BLAETTER_NUR_EINMAL.includes(blatt.name)) return;

     // Eindeutige Blattnamen mit laufender Nummer.
     let name = blatt.name;
     for (let n = 2; ziel.getWorksheet(name); n++) {
       name = `${blatt.name} (${n})`;
     }

     // ExcelJS gibt `merges` heraus, liest aber `mergeCells` (geprüft gegen 4.4.0 am 27.10.2026).
     const neuesBlatt = ziel.addWorksheet(name);
     const modell = klone(blatt.model);
     neuesBlatt.model = { ...modell, mergeCells: modell.merges, name, id: neuesBlatt.id };
   });
 });

 return [{ dateiname: dateien[0].dateiname, workbook: ziel }];
}

async function sendePdfAntwort(res, ergebnis) {
 // Immer eine Datei unter dem Sammelnamen des Excel-ZIPs.
 const dateien = fuehreWorkbooksZusammen(ergebnis.dateien)
   .map((d) => ({ ...d, dateiname: ergebnis.zipName }));

 const [{ dateiname, workbook }] = dateien;
 entferneLeereBlaetter(workbook);
 const xlsxBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
 // Der Name landet über &F in der Fußzeile, daher der echte Exportname.
 const pdfBuffer = await convertXlsxBufferToPdf(xlsxBuffer, dateiname);

 res.setHeader('Content-Type', 'application/pdf');
 res.setHeader('Content-Disposition', `attachment; filename=${dateiname}.pdf`);
 res.send(pdfBuffer);
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
     res.status(500).json({ message: 'Fehler beim PDF-Export' });
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

   await sendePdfAntwort(res, ergebnis);
   // Erst nach dem Senden markieren, dazwischen liegt noch die Konvertierung.
   await markiereZeitraum(ergebnis.zeitraumStatus);
   return;
 } catch (error) {
   console.error('Fehler beim PDF-Export (Range):', error);
   if (!res.headersSent) {
     res.status(500).json({ message: 'Fehler beim PDF-Export' });
   }
 }
};

// Fuer Tests: die Zusammenfuehrung ist ohne HTTP pruefbar.
exports.fuehreWorkbooksZusammen = fuehreWorkbooksZusammen;
