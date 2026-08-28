// Tests zum PDF-Export mehrblättriger Abrechnungen (Rückmeldung 28.08.).
//
// Reicht eine Abrechnung über mehr als ein Formularblatt (ab 30 Fahrten im
// Monat), lieferte der PDF-Export eine ZIP mit einer PDF je Blatt — das
// Frontend speicherte sie unverändert als .pdf, die sich nicht öffnen ließ.
// Seitdem führt der PDF-Export die Blätter zu einer Datei zusammen.
//
// Läuft ohne Test-Framework: `node test/pdfMehrblatt.test.js`.
// Die Umwandlung nach PDF braucht LibreOffice und wird nur ausgeführt, wenn
// `soffice` erreichbar ist (im Container immer, lokal je nach Installation).

const assert = require('assert');
const path = require('path');
const { execFileSync } = require('child_process');
const ExcelJS = require('exceljs');

const { fuehreWorkbooksZusammen } = require('../utils/pdfExport');

const TEMPLATE = path.join(__dirname, '..', 'templates', 'fahrtenabrechnung_vorlage.xlsx');
const QUARTAL = 'Juli-September';
const MITNAHME = 'Mitnahmeentschädigung';

let geprueft = 0;
const pruefe = async (beschreibung, fn) => {
  await fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
};

// Baut eine Teil-Mappe so, wie der Export sie je Formularblatt erzeugt:
// Deckblatt „Vorlage" plus genau ein befülltes Quartalsblatt.
async function teilMappe(markierung) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(TEMPLATE);
  ['Januar-März', 'April-Juni', 'Oktober-Dezember'].forEach((name) => {
    const ws = workbook.getWorksheet(name);
    if (ws) workbook.removeWorksheet(ws.id);
  });
  const blatt = workbook.getWorksheet(QUARTAL);
  blatt.getCell('A8').value = markierung;
  // Das echte Formular enthält Datumswerte — Fahrtdatum und
  // Ausstellungsdatum. Sie müssen die Zusammenführung als Date überstehen.
  blatt.getCell('A9').value = new Date(2026, 7, 25);
  blatt.getCell('B40').value = new Date(2026, 7, 28);
  return workbook;
}

async function main() {
  console.log('\nPDF-Export mehrblättriger Abrechnungen:');

  // --- Der Fehlerfall: zwei Teil-Mappen werden eine Datei ----------------
  await pruefe('zwei Teil-Mappen ergeben eine einzige Arbeitsmappe', async () => {
    const dateien = [
      { dateiname: 'abrechnung_1', workbook: await teilMappe('ERSTES BLATT') },
      { dateiname: 'abrechnung_2', workbook: await teilMappe('ZWEITES BLATT') },
    ];

    const zusammengefuehrt = fuehreWorkbooksZusammen(dateien);

    assert.strictEqual(zusammengefuehrt.length, 1,
      'mehrere Teil-Mappen müssen zu genau einer Datei werden — sonst schickt der Server wieder eine ZIP');
  });

  // Beide Quartalsblätter müssen erhalten bleiben, sonst fehlen Fahrten im PDF
  await pruefe('beide Formularblätter bleiben erhalten', async () => {
    const dateien = [
      { dateiname: 'abrechnung_1', workbook: await teilMappe('ERSTES BLATT') },
      { dateiname: 'abrechnung_2', workbook: await teilMappe('ZWEITES BLATT') },
    ];

    const [{ workbook }] = fuehreWorkbooksZusammen(dateien);
    const namen = workbook.worksheets.map((w) => w.name);

    assert.deepStrictEqual(namen, ['Vorlage', QUARTAL, MITNAHME, `${QUARTAL} (2)`]);
    assert.strictEqual(workbook.getWorksheet(QUARTAL).getCell('A8').value, 'ERSTES BLATT');
    assert.strictEqual(workbook.getWorksheet(`${QUARTAL} (2)`).getCell('A8').value, 'ZWEITES BLATT');
  });

  // Regression: über JSON geklonte Blätter machten aus Datumswerten
  // Zeichenketten — der Export brach beim Schreiben ab
  // („d.getTime is not a function"), sobald echte Fahrten drinstanden.
  await pruefe('Datumswerte bleiben Datumswerte', async () => {
    const dateien = [
      { dateiname: 'abrechnung_1', workbook: await teilMappe('ERSTES BLATT') },
      { dateiname: 'abrechnung_2', workbook: await teilMappe('ZWEITES BLATT') },
    ];

    const [{ workbook }] = fuehreWorkbooksZusammen(dateien);
    const kopiert = workbook.getWorksheet(`${QUARTAL} (2)`);

    assert.ok(kopiert.getCell('A9').value instanceof Date,
      'das Fahrtdatum muss ein Date bleiben');
    assert.strictEqual(kopiert.getCell('A9').value.getTime(), new Date(2026, 7, 25).getTime());
    assert.ok(kopiert.getCell('B40').value instanceof Date,
      'das Ausstellungsdatum muss ein Date bleiben');
  });

  // Die zusammengeführte Mappe muss sich auch schreiben lassen
  await pruefe('die zusammengeführte Mappe lässt sich als XLSX schreiben', async () => {
    const dateien = [
      { dateiname: 'abrechnung_1', workbook: await teilMappe('ERSTES BLATT') },
      { dateiname: 'abrechnung_2', workbook: await teilMappe('ZWEITES BLATT') },
    ];

    const [{ workbook }] = fuehreWorkbooksZusammen(dateien);
    const puffer = Buffer.from(await workbook.xlsx.writeBuffer());

    assert.ok(puffer.length > 0);
    assert.strictEqual(puffer.subarray(0, 2).toString('latin1'), 'PK');
  });

  // Das Deckblatt steckt in jeder Teil-Mappe identisch drin und darf im
  // fertigen PDF nur einmal auftauchen
  await pruefe('das Deckblatt kommt nur einmal vor', async () => {
    const dateien = [
      { dateiname: 'abrechnung_1', workbook: await teilMappe('ERSTES BLATT') },
      { dateiname: 'abrechnung_2', workbook: await teilMappe('ZWEITES BLATT') },
      { dateiname: 'abrechnung_3', workbook: await teilMappe('DRITTES BLATT') },
    ];

    const [{ workbook }] = fuehreWorkbooksZusammen(dateien);
    const deckblaetter = workbook.worksheets.filter((w) => w.name === 'Vorlage');

    assert.strictEqual(deckblaetter.length, 1);
  });

  // Die Mitnahmeentschädigung ist kein Fahrten-Blatt und wird nicht
  // aufgeteilt — sie darf sich beim Zusammenführen nicht vervielfachen
  await pruefe('die Mitnahmeentschädigung kommt nur einmal vor', async () => {
    const dateien = [
      { dateiname: 'abrechnung_1', workbook: await teilMappe('ERSTES BLATT') },
      { dateiname: 'abrechnung_2', workbook: await teilMappe('ZWEITES BLATT') },
    ];

    const [{ workbook }] = fuehreWorkbooksZusammen(dateien);
    const mitnahme = workbook.worksheets.filter((w) => w.name.startsWith(MITNAHME));

    assert.strictEqual(mitnahme.length, 1);
  });

  // Drei Teile: die Nummerierung muss weiterzählen statt zu kollidieren
  await pruefe('drei Teil-Mappen bekommen eindeutige Blattnamen', async () => {
    const dateien = [
      { dateiname: 'abrechnung_1', workbook: await teilMappe('ERSTES BLATT') },
      { dateiname: 'abrechnung_2', workbook: await teilMappe('ZWEITES BLATT') },
      { dateiname: 'abrechnung_3', workbook: await teilMappe('DRITTES BLATT') },
    ];

    const [{ workbook }] = fuehreWorkbooksZusammen(dateien);

    assert.deepStrictEqual(
      workbook.worksheets.map((w) => w.name),
      ['Vorlage', QUARTAL, MITNAHME, `${QUARTAL} (2)`, `${QUARTAL} (3)`]
    );
    assert.strictEqual(workbook.getWorksheet(`${QUARTAL} (3)`).getCell('A8').value, 'DRITTES BLATT');
  });

  // Eine einzelne Mappe darf die Zusammenführung unverändert überstehen
  await pruefe('eine einzelne Teil-Mappe bleibt unverändert', async () => {
    const dateien = [{ dateiname: 'abrechnung', workbook: await teilMappe('EINZIGES BLATT') }];

    const ergebnis = fuehreWorkbooksZusammen(dateien);

    assert.strictEqual(ergebnis.length, 1);
    assert.deepStrictEqual(ergebnis[0].workbook.worksheets.map((w) => w.name), ['Vorlage', QUARTAL, MITNAHME]);
  });

  // --- Das Ergebnis: ein PDF mit allen Seiten ----------------------------
  let hatLibreOffice = true;
  try {
    execFileSync(process.env.SOFFICE_BIN || 'soffice', ['--version'], { stdio: 'ignore' });
  } catch {
    hatLibreOffice = false;
  }

  if (!hatLibreOffice) {
    console.log('  --  Umwandlung nach PDF übersprungen (LibreOffice nicht gefunden)');
  } else {
    const { convertXlsxBufferToPdf } = require('../utils/xlsxToPdf');

    await pruefe('die zusammengeführte Mappe wird ein PDF mit einer Seite je Blatt', async () => {
      const dateien = [
        { dateiname: 'abrechnung_1', workbook: await teilMappe('ERSTES BLATT') },
        { dateiname: 'abrechnung_2', workbook: await teilMappe('ZWEITES BLATT') },
      ];

      const [{ workbook }] = fuehreWorkbooksZusammen(dateien);
      const xlsx = Buffer.from(await workbook.xlsx.writeBuffer());
      const pdf = await convertXlsxBufferToPdf(xlsx, 'fahrtenabrechnung_test');

      assert.strictEqual(pdf.subarray(0, 4).toString('latin1'), '%PDF',
        'das Ergebnis muss ein PDF sein — vorher kam hier eine ZIP an ("PK")');

      // Deckblatt + zwei Formularblätter + Mitnahmeentschädigung.
      // Im echten Export fliegt ein leeres Mitnahmeblatt vorher raus
      // (entferneLeereBlaetter) — hier steht die Vorlage unverändert.
      const seiten = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
      assert.strictEqual(seiten, 4);
    });
  }

  // --- Der Antwortpfad schickt nie wieder eine ZIP ----------------------
  await pruefe('der PDF-Export kennt keinen ZIP-Zweig mehr', async () => {
    const quelltext = require('fs').readFileSync(
      path.join(__dirname, '..', 'utils', 'pdfExport.js'), 'utf8'
    );

    assert.ok(!/application\/zip/.test(quelltext),
      'der PDF-Export darf keine ZIP mehr ausliefern — genau daran scheiterte das Öffnen');
    assert.ok(!/JSZip/.test(quelltext),
      'ohne ZIP-Zweig wird JSZip hier nicht mehr gebraucht');
    assert.ok(/Content-Type', 'application\/pdf'/.test(quelltext),
      'die Antwort muss als PDF ausgezeichnet sein');
  });

  console.log(`\n${geprueft} Prüfungen bestanden.\n`);
}

main().catch((error) => {
  console.error('\nFEHLGESCHLAGEN:', error.message);
  process.exit(1);
});
