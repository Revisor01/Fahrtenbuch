// Punkt 12 der Pre-Launch-Liste, letzter offener Teil: 28 parallele
// Monatsabrufe beim App-Start.
//
// fetchMonthlyData holte fuer jeden der 28 betrachteten Monate einen eigenen
// Monatsbericht — beim Start, nach jedem Speichern und nach jedem
// Statuswechsel. Zusammen mit den uebrigen Abrufen kam der Start auf 35
// Anfragen, bei einem Rate-Limit von 600 in fuenf Minuten.
//
// Die Sammel-Route /api/fahrten/monthly-summary gab es bereits, sie wurde
// aber von niemandem aufgerufen. Sie ist jetzt um abrechnungsStatus,
// kmProTraeger, fahrtenCount, totalKm und gesamtErstattung erweitert —
// additiv, die bisherigen Felder sind unveraendert.
//
// Gemessen: 35 -> 8 Anfragen beim App-Start.
//
// DIE FALLE, um die es hier vor allem geht: Der Monatsbericht liefert
// `erstattungen[traegerId]` als blosse ZAHL, die Sammel-Route als OBJEKT
// { kilometer, erstattung }. Dashboard und Abrechnung rechnen mit der Zahl
// (`Number(...)`, `b > 0`) — ohne Umwandlung stuenden dort ueberall 0 € und
// NaN. Genau diese Umwandlung wird unten mit echten Werten nachgerechnet.
//
// Laeuft ohne Test-Framework: `node test/monatsuebersicht.test.js`.

const assert = require('assert');
const fs = require('fs');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

const ctx = fs.readFileSync(
  __dirname + '/../../frontend/src/contexts/AppContext.js', 'utf8');
const ctrl = fs.readFileSync(__dirname + '/../controllers/fahrtController.js', 'utf8');
const modell = fs.readFileSync(__dirname + '/../models/Abrechnung.js', 'utf8');

// --- 1. Ein Abruf statt 28 -------------------------------------------------
console.log('\n1 — Die Oberflaeche fragt einmal:');

const fnQuelle = ctx.split('const fetchMonthlyData = async')[1].split('\n  const ')[0];

pruefe('fetchMonthlyData ruft die Sammel-Route', () => {
  assert.ok(/fahrten\/monthly-summary/.test(fnQuelle));
});

pruefe('die Monatsschleife ist weg', () => {
  assert.ok(!/promises\.push/.test(fnQuelle), 'kein Aufbau einer Abrufliste mehr');
  assert.ok(!/fahrten\/report\//.test(fnQuelle), 'keine Einzelberichte mehr');
  assert.ok(!/Promise\.all/.test(fnQuelle));
});

pruefe('genau ein axios-Aufruf bleibt', () => {
  assert.strictEqual((fnQuelle.match(/axios\.get\(/g) || []).length, 1);
});

pruefe('„keine Fahrten" (404) ist kein Fehler', () => {
  // Die Route antwortet seit jeher mit 404, wenn nichts erfasst ist. Ohne
  // diesen Zweig saehe die Nutzer:in beim ersten Start eine Fehlermeldung.
  assert.ok(/error\?\.response\?\.status === 404/.test(fnQuelle));
  // Nur den if-Block selbst, nicht was danach folgt.
  const zweig = fnQuelle.split('=== 404) {')[1].split('\n      }')[0];
  assert.ok(/setMonthlyData\(\[\]\)/.test(zweig));
  assert.ok(!/logFehler/.test(zweig), 'kein Protokolleintrag fuer den Normalfall');
});

// --- 2. Die Struktur-Falle --------------------------------------------------
console.log('\n2 — erstattungen bleiben Zahlen:');

// Die Umwandlung aus dem Context mit einer echten Antwort durchrechnen.
const block = ctx.split('const roh = Array.isArray(response?.data) ? response.data : [];')[1]
  .split('setMonthlyData(data);')[0];
// eslint-disable-next-line no-new-func
const wandle = new Function('roh', block + ' return data;');

const antwort = [
  { yearMonth: '2026-08',
    erstattungen: { 1: { kilometer: 124.5, erstattung: 37.35 },
                    mitfahrer: { kilometer: 40, erstattung: 2 } },
    abrechnungsStatus: { 1: { eingereicht_am: '2026-09-05', erhalten_am: null } },
    kmProTraeger: { 1: 124.5 }, fahrtenCount: 12, totalKm: 124.5, gesamtErstattung: 39.35 },
  { yearMonth: '2026-07', erstattungen: {}, abrechnungsStatus: {},
    kmProTraeger: {}, fahrtenCount: 0, totalKm: 0, gesamtErstattung: 0 },
];
const data = wandle(antwort);

pruefe('je Traeger steht eine Zahl, kein Objekt', () => {
  assert.strictEqual(typeof data[0].erstattungen['1'], 'number',
    'Dashboard rechnet mit Number(erstattungen[id]) — ein Objekt ergibt NaN');
  assert.strictEqual(data[0].erstattungen['1'], 37.35);
});

pruefe('auch der Sonderwert mitfahrer', () => {
  assert.strictEqual(data[0].erstattungen.mitfahrer, 2);
});

pruefe('die Kilometer gehen dabei nicht verloren', () => {
  assert.strictEqual(data[0].kilometerJeTraeger['1'], 124.5);
  assert.strictEqual(data[0].kmProTraeger['1'], 124.5);
});

pruefe('alle Felder, die die Oberflaeche liest, sind da', () => {
  for (const feld of ['yearMonth', 'monthName', 'year', 'monatNr', 'erstattungen',
                      'abrechnungsStatus', 'totalErstattung', 'totalKm',
                      'kmProTraeger', 'fahrtenCount']) {
    assert.ok(feld in data[0], `${feld} fehlt`);
  }
});

pruefe('Jahr, Monatsnummer und Name stimmen', () => {
  assert.strictEqual(data[0].year, 2026);
  assert.strictEqual(data[0].monatNr, 8);
  assert.strictEqual(data[0].monthName, 'August');
});

pruefe('leere Monate fallen heraus — wie bisher', () => {
  assert.strictEqual(data.length, 1, 'der Monat ohne Fahrten darf nicht auftauchen');
});

pruefe('ein Monat ohne Erstattung, aber mit Fahrten bleibt', () => {
  const nurFahrten = wandle([{ yearMonth: '2026-06', erstattungen: {},
    abrechnungsStatus: {}, kmProTraeger: {}, fahrtenCount: 3, totalKm: 20,
    gesamtErstattung: 0 }]);
  assert.strictEqual(nurFahrten.length, 1);
});

pruefe('neueste Monate stehen vorn', () => {
  const mehrere = wandle([
    { yearMonth: '2026-06', erstattungen: {}, fahrtenCount: 1 },
    { yearMonth: '2026-09', erstattungen: {}, fahrtenCount: 1 },
    { yearMonth: '2026-07', erstattungen: {}, fahrtenCount: 1 },
  ]);
  assert.deepStrictEqual(mehrere.map((m) => m.yearMonth),
    ['2026-09', '2026-07', '2026-06']);
});

pruefe('eine unerwartete Antwort stuerzt nicht ab', () => {
  assert.deepStrictEqual(wandle([]), []);
});

// --- 3. Die Route liefert, was gebraucht wird -------------------------------
console.log('\n3 — Die Sammel-Route wurde additiv erweitert:');

const route = ctrl.split('exports.getMonthlySummary')[1].split('\nexports.')[0];

pruefe('die bisherigen Felder sind unveraendert', () => {
  assert.ok(/yearMonth: fahrt\.yearMonth/.test(route));
  assert.ok(/erstattungen: \{\}/.test(route));
});

for (const feld of ['abrechnungsStatus', 'kmProTraeger', 'fahrtenCount',
                    'totalKm', 'gesamtErstattung']) {
  pruefe(`${feld} kommt dazu`, () => {
    assert.ok(new RegExp(`${feld}`).test(route), `${feld} fehlt in der Route`);
  });
}

pruefe('der Status kommt in EINER Abfrage, nicht je Monat', () => {
  assert.ok(/Abrechnung\.getStatusNachMonat\(userId\)/.test(route),
    'sonst waere der Gewinn im Frontend im Backend wieder verspielt');
  assert.ok(/static async getStatusNachMonat/.test(modell));
  const fn = modell.split('static async getStatusNachMonat')[1].split('\n    }')[0];
  assert.strictEqual((fn.match(/db\.execute/g) || []).length, 1);
});

pruefe('der 404 bei „keine Fahrten" bleibt bestehen', () => {
  // Bestandsverhalten der Route — ein API-Key-Client koennte darauf bauen.
  assert.ok(/Keine Daten für die monatliche Zusammenfassung gefunden/.test(route));
});

console.log('\n' + geprueft + ' Pruefungen bestanden.');
