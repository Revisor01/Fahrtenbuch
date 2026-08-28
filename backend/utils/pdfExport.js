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

// Reicht eine Abrechnung über mehrere Formularblätter (ab 30 Fahrten im
// Monat), lieferte der Export bisher eine ZIP mit je einer PDF pro Blatt.
// Zum Einreichen ist eine Datei mit mehreren Seiten praktischer — LibreOffice
// druckt jedes Blatt einer Arbeitsmappe ohnehin auf eine eigene Seite.
// Deshalb wandern die Blätter der Teil-Mappen vor der Umwandlung in die
// erste Mappe. Der Excel-Export bleibt bei getrennten Dateien: dort sind es
// eigenständige Arbeitsmappen, die auch einzeln bearbeitet werden.
const BLAETTER_NUR_EINMAL = ['Vorlage', 'Mitnahmeentschädigung'];

// Tiefe Kopie, die Date-Werte als Date belässt. Über JSON würden sie zu
// Zeichenketten — ExcelJS erwartet beim Schreiben aber echte Daten und
// bricht sonst mit „d.getTime is not a function" ab. Im Formular stecken
// welche: das Datum jeder Fahrt und das Ausstellungsdatum.
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
     // Deckblatt und Mitnahmeentschädigung stehen in jeder Teil-Mappe
     // identisch drin — sie gehören einmal ins PDF, nicht je Teil.
     // Aufgeteilt werden nur die Fahrten, also die Quartalsblätter.
     if (BLAETTER_NUR_EINMAL.includes(blatt.name)) return;

     // Blattnamen müssen eindeutig sein; die Nummer sagt zugleich, das
     // wievielte Blatt der Abrechnung es ist.
     let name = blatt.name;
     for (let n = 2; ziel.getWorksheet(name); n++) {
       name = `${blatt.name} (${n})`;
     }

     const neuesBlatt = ziel.addWorksheet(name);
     neuesBlatt.model = { ...klone(blatt.model), name, id: neuesBlatt.id };
   });
 });

 return [{ dateiname: dateien[0].dateiname, workbook: ziel }];
}

async function sendePdfAntwort(res, ergebnis) {
 // Der PDF-Export liefert immer genau eine Datei — mehrere Formularblätter
 // werden zu Seiten darin. Die Teil-Mappen heißen „…_1", „…_2"; für die eine
 // Datei passt der Sammelname, unter dem der Excel-Export sein ZIP ablegt.
 const dateien = fuehreWorkbooksZusammen(ergebnis.dateien)
   .map((d) => ({ ...d, dateiname: ergebnis.zipName }));

 const [{ dateiname, workbook }] = dateien;
 entferneLeereBlaetter(workbook);
 const xlsxBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
 // Der Dateiname landet über die Kopf-/Fußzeile des Formulars (&F) im PDF —
 // deshalb den echten Exportnamen und keinen Zufallsnamen verwenden.
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

// Fuer Tests: die Zusammenfuehrung ist ohne HTTP pruefbar.
exports.fuehreWorkbooksZusammen = fuehreWorkbooksZusammen;
