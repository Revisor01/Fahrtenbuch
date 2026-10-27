// Tests zur Zeilenhöhe im Abrechnungsformular (Rückmeldung 30.09.).
//
// Anschrift und Reisezweck stehen in verbundenen Zellen. Deren Zeilenhöhe
// passen weder Excel noch LibreOffice an: Ein zweizeiliger Reisezweck lief im
// PDF in die Nachbarzeile. Der Export setzt die Höhe deshalb selbst.
//
// Läuft ohne Test-Framework: `node test/zeilenhoehe.test.js`.
// Die Umwandlung nach PDF braucht LibreOffice und wird nur ausgeführt, wenn
// `soffice` erreichbar ist.

const assert = require('assert');
const path = require('path');
const { execFileSync } = require('child_process');
const ExcelJS = require('exceljs');

const { fillQuartalSheet, benoetigteZeilen } = require('../utils/excelExport');

const TEMPLATE = path.join(__dirname, '..', 'templates', 'fahrtenabrechnung_vorlage.xlsx');
const QUARTAL = 'Juli-September';
const STANDARDHOEHE = 13;

let geprueft = 0;
const pruefe = async (beschreibung, fn) => {
  await fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
};

const fahrt = (anlass, vonOrt = 'Hans-Böckler-Str. 30, Heide') => ({
  datum: new Date(2026, 8, 20),
  vonOrt,
  nachOrt: 'Kapellenplatz 3 / Kirche und Kirchenbüro',
  anlass,
  kilometer: 15,
});

async function quartalsblatt(fahrten) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(TEMPLATE);
  const blatt = workbook.getWorksheet(QUARTAL);
  fillQuartalSheet(blatt, fahrten, 2026, 0.3, []);
  return { workbook, blatt };
}

async function main() {
  console.log('\nZeilenhöhe im Abrechnungsformular:');

  await pruefe('kurzer Text braucht eine Zeile, langer zwei', async () => {
    assert.strictEqual(benoetigteZeilen('Fahrt ins Kirchenbüro', 37), 1);
    assert.strictEqual(benoetigteZeilen('Fahrt in die Gemeinde, Trauergespräch', 37), 1);
    assert.strictEqual(benoetigteZeilen('Fahrt in die Gemeinde, Kirchenbüro, Geburtstagscafe', 37), 2);
    assert.strictEqual(benoetigteZeilen('', 37), 1);
    assert.strictEqual(benoetigteZeilen(null, 37), 1);
  });

  await pruefe('ein Wort länger als die Spalte zählt über mehrere Zeilen', async () => {
    assert.strictEqual(benoetigteZeilen('x'.repeat(100), 37), 3);
  });

  // Der Fehlerfall aus dem echten Export: zweizeiliger Reisezweck
  await pruefe('eine Fahrt mit zweizeiligem Reisezweck bekommt eine doppelt hohe Zeile', async () => {
    const { blatt } = await quartalsblatt([
      fahrt('Fahrt ins Kirchenbüro'),
      fahrt('Fahrt in die Gemeinde, Kirchenbüro, Geburtstagscafe'),
    ]);

    assert.strictEqual(blatt.getRow(9).height, 2 * STANDARDHOEHE);
  });

  await pruefe('eine einzeilige Fahrt behält die Höhe der Vorlage', async () => {
    const { blatt } = await quartalsblatt([
      fahrt('Fahrt ins Kirchenbüro'),
      fahrt('Fahrt in die Gemeinde, Kirchenbüro, Geburtstagscafe'),
      fahrt('Fahrt ins Kirchenbüro'),
    ]);

    assert.strictEqual(blatt.getRow(8).height, undefined);
    // Zeile 10 ist in der Vorlage schon höher und darf nicht schrumpfen
    assert.strictEqual(blatt.getRow(10).height, 24.75);
  });

  await pruefe('eine lange Anschrift zählt genauso wie ein langer Reisezweck', async () => {
    const { blatt } = await quartalsblatt([
      fahrt('Gottesdienst', 'Friedrich-Scheele-Straße 9, 25767 Albersdorf, Gemeindehaus hinten'),
    ]);

    assert.strictEqual(blatt.getRow(8).height, 2 * STANDARDHOEHE);
  });

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

    // Das Blatt ist auf eine Seite skaliert; höhere Zeilen dürfen das
    // Formular nicht auf eine zweite Seite schieben.
    await pruefe('29 zweizeilige Fahrten passen weiter auf eine Seite', async () => {
      const fahrten = Array.from({ length: 29 }, () =>
        fahrt('Fahrt in die Gemeinde, Kirchenbüro, Geburtstagscafe'));
      const { workbook } = await quartalsblatt(fahrten);
      workbook.worksheets
        .filter((w) => w.name !== QUARTAL)
        .forEach((w) => workbook.removeWorksheet(w.id));

      const pdf = await convertXlsxBufferToPdf(
        Buffer.from(await workbook.xlsx.writeBuffer()), 'zeilenhoehe_test');
      const seiten = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;

      assert.strictEqual(seiten, 1);
    });
  }

  console.log(`\n${geprueft} Prüfungen bestanden.\n`);
}

main().catch((error) => {
  console.error('\nFEHLGESCHLAGEN:', error.message);
  process.exit(1);
});
