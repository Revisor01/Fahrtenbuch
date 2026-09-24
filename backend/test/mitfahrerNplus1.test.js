// Punkt 12 der Pre-Launch-Liste: N+1 beim Laden der Mitfahrer.
//
// getMonthlyReport und getDateRangeReport holen die Mitfahrer bereits per
// LEFT JOIN. Der Controller warf alle Zeilen ab der zweiten weg
// (dedupeByFahrtId) und lud sie danach einzeln nach — bei 30 Fahrten im
// Monat 30 zusaetzliche Abfragen, beim App-Start ueber alle Monate rund
// 1.100. Im Zeitraum-Report ueber sechs Monate entsprechend mehr.
//
// Der heikle Teil ist die Antwortform: Die Apps auf den Geraeten lesen
// `mitfahrer` mit den Feldern aus `SELECT * FROM mitfahrer` und lassen sich
// nicht mitdeployen. Der Nachbau muss exakt dieselbe Form liefern.
//
// Zweite Falle: Der Excel-Export ruft Fahrt.getMonthlyReport DIREKT und
// braucht die rohen JOIN-Zeilen mit mitfahrer_id an der Fahrt. Er darf nicht
// auf den Controller-Helfer umgestellt werden.
//
// Laeuft ohne Test-Framework: `node test/mitfahrerNplus1.test.js`.

const assert = require('assert');
const fs = require('fs');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

const ctrl = fs.readFileSync(__dirname + '/../controllers/fahrtController.js', 'utf8');

// Den Helfer aus dem Quelltext holen und ausfuehren.
const rumpf = ctrl.split('function fahrtenMitMitfahrern(rows) {')[1].split('\n}')[0];
// eslint-disable-next-line no-new-func
const fahrtenMitMitfahrern = new Function('rows', '{' + rumpf + '\n}');

const zeilen = [
  { id: 1, user_id: 7, datum: '2026-09-01', anlass: 'A', kilometer: 10,
    von_ort_name: 'X', nach_ort_name: 'Y', partner_fahrt_id: null,
    mitfahrer_id: 100, mitfahrer_name: 'Anna', arbeitsstaette: 'Buero', richtung: 'hin' },
  { id: 1, user_id: 7, datum: '2026-09-01', anlass: 'A', kilometer: 10,
    von_ort_name: 'X', nach_ort_name: 'Y', partner_fahrt_id: null,
    mitfahrer_id: 101, mitfahrer_name: 'Bert', arbeitsstaette: null, richtung: 'hin_rueck' },
  { id: 2, user_id: 7, datum: '2026-09-02', anlass: 'B', kilometer: 5,
    von_ort_name: 'Y', nach_ort_name: 'X', partner_fahrt_id: null,
    mitfahrer_id: null, mitfahrer_name: null, arbeitsstaette: null, richtung: null },
];

// --- 1. Die Zusammenfuehrung ----------------------------------------------
console.log('\n1 — Eine Zeile je Fahrt, Mitfahrer dabei:');

const ergebnis = fahrtenMitMitfahrern(zeilen);

pruefe('drei JOIN-Zeilen ergeben zwei Fahrten', () => {
  assert.strictEqual(ergebnis.length, 2);
  assert.deepStrictEqual(ergebnis.map((f) => f.id), [1, 2]);
});

pruefe('die Mitfahrer haengen an der richtigen Fahrt', () => {
  assert.strictEqual(ergebnis[0].mitfahrer.length, 2);
  assert.deepStrictEqual(ergebnis[0].mitfahrer.map((m) => m.name), ['Anna', 'Bert']);
});

pruefe('eine Fahrt ohne Mitfahrer bekommt eine leere Liste, keine NULL-Person', () => {
  // Der LEFT JOIN liefert dort NULL-Spalten — die duerfen nicht als
  // Mitfahrer „ohne Namen" in der Abrechnung landen.
  assert.deepStrictEqual(ergebnis[1].mitfahrer, []);
});

pruefe('die Reihenfolge der Fahrten bleibt wie vom Server geliefert', () => {
  const gedreht = fahrtenMitMitfahrern([zeilen[2], zeilen[0], zeilen[1]]);
  assert.deepStrictEqual(gedreht.map((f) => f.id), [2, 1]);
});

// --- 2. Die Antwortform ----------------------------------------------------
console.log('\n2 — Die Form bleibt, wie die Apps sie kennen:');

pruefe('ein Mitfahrer hat genau die Felder von SELECT * FROM mitfahrer', () => {
  assert.deepStrictEqual(
    Object.keys(ergebnis[0].mitfahrer[0]).sort(),
    ['arbeitsstaette', 'fahrt_id', 'id', 'name', 'richtung']
  );
});

pruefe('die Werte stimmen, auch NULL bleibt NULL', () => {
  assert.deepStrictEqual(ergebnis[0].mitfahrer[0],
    { id: 100, fahrt_id: 1, name: 'Anna', arbeitsstaette: 'Buero', richtung: 'hin' });
  assert.strictEqual(ergebnis[0].mitfahrer[1].arbeitsstaette, null);
});

pruefe('die Mitfahrer-Spalten haengen NICHT mehr an der Fahrt', () => {
  for (const feld of ['mitfahrer_id', 'mitfahrer_name']) {
    assert.ok(!(feld in ergebnis[0]), `${feld} gehoert nicht an die Fahrt`);
  }
});

pruefe('alle Fahrt-Felder bleiben erhalten', () => {
  for (const feld of ['id', 'user_id', 'datum', 'anlass', 'kilometer',
                      'von_ort_name', 'nach_ort_name', 'partner_fahrt_id']) {
    assert.ok(feld in ergebnis[0], `${feld} fehlt — die Apps lesen es`);
  }
});

// --- 3. Kein Nachladen mehr ------------------------------------------------
console.log('\n3 — Die Einzelabfragen sind weg:');

pruefe('der Monatsbericht laedt Mitfahrer nicht mehr nach', () => {
  const abschnitt = ctrl.split('exports.getMonthlyReport')[1].split('\nexports.')[0];
  assert.ok(/fahrtenMitMitfahrern\(/.test(abschnitt));
  assert.ok(!/Mitfahrer\.findByFahrtId/.test(abschnitt),
    'die Schleife mit einer Abfrage je Fahrt muss weg sein');
});

pruefe('der Zeitraum-Bericht ebenso', () => {
  const abschnitt = ctrl.split('exports.getReportRange')[1].split('\nexports.')[0];
  assert.ok(/fahrtenMitMitfahrern\(/.test(abschnitt));
  assert.ok(!/Mitfahrer\.findByFahrtId/.test(abschnitt));
});

pruefe('der alte Helfer dedupeByFahrtId ist entfernt', () => {
  assert.ok(!/function dedupeByFahrtId/.test(ctrl),
    'toter Code, der zum erneuten Nachladen verleitet');
});

pruefe('die Einzelfahrt laedt weiterhin gezielt nach', () => {
  // Dort gibt es keine JOIN-Zeilen, eine Abfrage ist richtig.
  const abschnitt = ctrl.split('exports.getFahrtById')[1].split('\nexports.')[0];
  assert.ok(/Mitfahrer\.findByFahrtId/.test(abschnitt));
});

// --- 4. Der Excel-Export bleibt unberuehrt ---------------------------------
console.log('\n4 — Der Export braucht die rohen Zeilen:');

const excel = fs.readFileSync(__dirname + '/../utils/excelExport.js', 'utf8');

pruefe('er holt seine Daten direkt aus dem Modell', () => {
  assert.ok(/Fahrt\.getMonthlyReport\(/.test(excel));
  assert.ok(/Fahrt\.getDateRangeReport\(/.test(excel));
});

pruefe('er liest mitfahrer_id an der Fahrt — der Helfer darf ihn nicht anfassen', () => {
  assert.ok(/fahrt\.mitfahrer_id/.test(excel),
    'genau deshalb bleibt prepareMitfahrerData auf den JOIN-Zeilen');
  assert.ok(!/fahrtenMitMitfahrern/.test(excel),
    'der Controller-Helfer wuerde dem Export die Spalten wegnehmen');
});

console.log('\n' + geprueft + ' Pruefungen bestanden.');
