// Punkt 3 der Pre-Launch-Liste: Der Zeitraum-Export setzte den Status auf
// „eingereicht", bevor die Datei existierte.
//
// `setzeZeitraumStatus` lief INNERHALB von `baueZeitraumWorkbooks`, also vor
// dem Senden — beim PDF sogar vor der LibreOffice-Konvertierung (60-s-
// Timeout). Brach der Lauf bei Monat 3 von 6 ab, standen zwei Monate auf
// „eingereicht", vier nicht, und es gab keine Datei. Jedes updateStatus war
// ein eigenes Autocommit, also auch kein gemeinsames Zurueckrollen.
//
// Geprueft wird die Reihenfolge (Status NACH dem Senden) und die
// Transaktion (alle Monate oder keiner) — beides ohne Datenbank, mit einer
// nachgebauten Verbindung.
//
// Laeuft ohne Test-Framework: `node test/zeitraumStatus.test.js`.

const assert = require('assert');
const fs = require('fs');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}
const lies = (pfad) => fs.readFileSync(__dirname + '/../' + pfad, 'utf8');

// --- 1. Reihenfolge im Quelltext ------------------------------------------
console.log('\n1 — Der Status wird nicht mehr beim Bauen gesetzt:');

const excel = lies('utils/excelExport.js');
const pdf = lies('utils/pdfExport.js');

pruefe('baueZeitraumWorkbooks setzt keinen Status mehr', () => {
  const bauen = excel.split('async function baueZeitraumWorkbooks')[1]
    .split('\n// Zeitraum als eingereicht markieren')[0];
  assert.ok(!/setzeZeitraumStatus\(/.test(bauen),
    'im Bauen darf kein Status gesetzt werden');
  assert.ok(!/markiereZeitraum\(/.test(bauen),
    'auch die neue Funktion gehoert nicht ins Bauen');
  assert.ok(/zeitraumStatus:/.test(bauen),
    'das Bauen muss den Zeitraum stattdessen zurueckgeben');
});

pruefe('die alte Funktion setzeZeitraumStatus existiert nicht mehr', () => {
  assert.ok(!/function setzeZeitraumStatus/.test(excel),
    'sonst bleibt der alte Weg offen und wird versehentlich wieder benutzt');
});

pruefe('der Excel-Handler markiert NACH dem Senden', () => {
  const handler = excel.split('exports.exportToExcelRange')[1].split('exports.')[0];
  const senden = handler.indexOf('sendeExcelAntwort');
  const markieren = handler.indexOf('markiereZeitraum');
  assert.ok(senden > -1 && markieren > -1, 'beide Schritte muessen vorkommen');
  assert.ok(senden < markieren,
    'der Status darf erst gesetzt werden, wenn die Datei raus ist');
});

pruefe('der PDF-Handler markiert NACH dem Senden', () => {
  const handler = pdf.split('exports.exportToPdfRange')[1].split('exports.')[0];
  const senden = handler.indexOf('sendePdfAntwort');
  const markieren = handler.indexOf('markiereZeitraum');
  assert.ok(senden > -1 && markieren > -1, 'beide Schritte muessen vorkommen');
  assert.ok(senden < markieren,
    'zwischen Bauen und Senden liegt hier noch LibreOffice');
});

pruefe('die Einzelmonats-Exporte markieren weiterhin nichts', () => {
  // Nur der Zeitraum-Export setzt Status. Am Monatsexport aendert sich nichts.
  const monat = excel.split('exports.exportToExcel =')[1].split('exports.')[0];
  assert.ok(!/markiereZeitraum/.test(monat));
});

// --- 2. Die Transaktion ---------------------------------------------------
// markiereZeitraumEingereicht wird mit einer nachgebauten Verbindung
// geprueft: entweder alle Monate oder keiner.
console.log('\n2 — Alle Monate oder keiner:');

function ladeAbrechnungMitFakeDb(verbindungsVerhalten) {
  const protokoll = { befehle: [], commits: 0, rollbacks: 0, freigaben: 0, zeilen: [] };
  const connection = {
    async beginTransaction() { protokoll.befehle.push('begin'); },
    async execute(sql, params) {
      protokoll.befehle.push('execute');
      if (verbindungsVerhalten && verbindungsVerhalten(protokoll.zeilen.length + 1)) {
        throw new Error('Verbindung weg');
      }
      protokoll.zeilen.push({ jahr: params[1], monat: params[2], typ: params[3] });
      return [{}];
    },
    async commit() { protokoll.commits += 1; },
    async rollback() { protokoll.rollbacks += 1; },
    release() { protokoll.freigaben += 1; },
  };
  const fakeDb = {
    async execute() { return [[{ id: 1 }]]; }, // Traeger-Pruefung
    async getConnection() { return connection; },
  };

  // config/database durch die Attrappe ersetzen und das Modell frisch laden.
  // So laeuft die echte Transaktionslogik, nur gegen eine Verbindung, die
  // wir steuern koennen — ohne MySQL im Test.
  const pfad = require.resolve('../config/database');
  const modellPfad = require.resolve('../models/Abrechnung');
  delete require.cache[modellPfad];
  const vorher = require.cache[pfad];
  require.cache[pfad] = { id: pfad, filename: pfad, loaded: true, exports: fakeDb };
  const Abrechnung = require(modellPfad);
  // Cache wieder aufraeumen, damit andere Tests die echte DB-Konfiguration sehen
  if (vorher) require.cache[pfad] = vorher; else delete require.cache[pfad];
  delete require.cache[modellPfad];

  return { Abrechnung, protokoll };
}

const laeuft = [];

laeuft.push(async () => {
  const { Abrechnung, protokoll } = ladeAbrechnungMitFakeDb(null);
  await Abrechnung.markiereZeitraumEingereicht({
    userId: 1, startYear: '2026', startMonth: '01', endYear: '2026', endMonth: '06',
    typ: '3', datum: '2026-09-24',
  });
  assert.strictEqual(protokoll.zeilen.length, 6, 'sechs Monate = sechs Zeilen');
  assert.strictEqual(protokoll.commits, 1, 'genau ein Commit');
  assert.strictEqual(protokoll.rollbacks, 0);
  assert.strictEqual(protokoll.freigaben, 1, 'die Verbindung muss freigegeben werden');
  assert.deepStrictEqual(
    protokoll.zeilen.map((z) => `${z.jahr}-${z.monat}`),
    ['2026-1', '2026-2', '2026-3', '2026-4', '2026-5', '2026-6']
  );
  geprueft += 1;
  console.log('  ok  sechs Monate laufen in einer Transaktion durch');
});

laeuft.push(async () => {
  // Abbruch bei Monat 3 von 6 — genau der Fall aus dem Befund.
  const { Abrechnung, protokoll } = ladeAbrechnungMitFakeDb((n) => n === 3);
  await assert.rejects(
    () => Abrechnung.markiereZeitraumEingereicht({
      userId: 1, startYear: '2026', startMonth: '01', endYear: '2026', endMonth: '06',
      typ: '3', datum: '2026-09-24',
    }),
    /Verbindung weg/
  );
  assert.strictEqual(protokoll.commits, 0, 'kein Commit bei Abbruch');
  assert.strictEqual(protokoll.rollbacks, 1, 'es muss zurueckgerollt werden');
  assert.strictEqual(protokoll.freigaben, 1, 'auch im Fehlerfall freigeben');
  geprueft += 1;
  console.log('  ok  Abbruch bei Monat 3 rollt alles zurueck, nichts bleibt „eingereicht"');
});

laeuft.push(async () => {
  // Jahreswechsel: Nov 2025 bis Feb 2026 = 4 Monate
  const { Abrechnung, protokoll } = ladeAbrechnungMitFakeDb(null);
  await Abrechnung.markiereZeitraumEingereicht({
    userId: 1, startYear: '2025', startMonth: '11', endYear: '2026', endMonth: '02',
    typ: 'mitfahrer', datum: '2026-09-24',
  });
  assert.deepStrictEqual(
    protokoll.zeilen.map((z) => `${z.jahr}-${z.monat}`),
    ['2025-11', '2025-12', '2026-1', '2026-2']
  );
  assert.ok(protokoll.zeilen.every((z) => z.typ === 'mitfahrer'),
    'der Typ muss als String gebunden werden — sonst castet MySQL die Spalte');
  geprueft += 1;
  console.log('  ok  Jahreswechsel und der Sonderwert „mitfahrer" stimmen');
});

laeuft.push(async () => {
  // Ein einzelner Monat im Zeitraum-Export
  const { Abrechnung, protokoll } = ladeAbrechnungMitFakeDb(null);
  await Abrechnung.markiereZeitraumEingereicht({
    userId: 1, startYear: '2026', startMonth: '09', endYear: '2026', endMonth: '09',
    typ: '1', datum: '2026-09-24',
  });
  assert.strictEqual(protokoll.zeilen.length, 1);
  geprueft += 1;
  console.log('  ok  ein einzelner Monat ergibt genau eine Zeile');
});

// --- 3. markiereZeitraum schluckt Fehler ----------------------------------
console.log('\n3 — Nach dem Senden darf nichts mehr werfen:');

laeuft.push(async () => {
  // Die Antwort ist raus; ein Wurf hier wuerde im Handler-catch landen und
  // ein res.status(500) auf eine bereits gesendete Antwort versuchen.
  const quelle = excel.split('async function markiereZeitraum')[1].split('\n}')[0];
  assert.ok(/try\s*\{/.test(quelle) && /catch/.test(quelle),
    'markiereZeitraum muss seine Fehler selbst abfangen');
  assert.ok(/if \(!zeitraumStatus\) return;/.test(quelle),
    'ohne Zeitraum (Monatsexport) darf nichts passieren');
  geprueft += 1;
  console.log('  ok  markiereZeitraum faengt Fehler ab und vertraegt fehlenden Zeitraum');
});

(async () => {
  for (const t of laeuft) await t();
  console.log('\n' + geprueft + ' Pruefungen bestanden.');
})().catch((e) => {
  console.error('\nFEHLGESCHLAGEN:', e.message);
  process.exit(1);
});
