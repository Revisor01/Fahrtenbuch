// Punkt 15 der Pre-Launch-Liste: Token im Geraetelog.
//
// `console.error('…', error)` mit einem AxiosError schreibt das ganze Objekt
// ins Log — darin stecken `config.headers.Authorization` (das Bearer-Token)
// und `config.data` (bei der Anmeldung Benutzername und Passwort im
// Klartext). Im Browser bleibt das in der Entwicklerkonsole; in der App
// landet es im Geraetelog, das sich ueber Console.app oder `adb logcat` von
// aussen mitlesen laesst.
//
// Die Liste schaetzte ~60 Stellen, es waren 111. Umgestellt sind die 87 mit
// API-Bezug; die uebrigen protokollieren Speicher- und Plattformfehler, in
// denen kein Anfrageobjekt steckt.
//
// Laeuft ohne Test-Framework: `node test/logHygiene.test.js`.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

const frontend = __dirname + '/../../frontend/';
const helfer = fs.readFileSync(frontend + 'src/utils/logFehler.js', 'utf8');

// --- 1. Der Helfer selbst --------------------------------------------------
console.log('\n1 — logFehler haelt Zugangsdaten zurueck:');

// Als Funktion ausfuehren, statt nur den Text zu lesen.
const ausgaben = [];
const logFehler = new Function('console',
  helfer.replace('export default function', 'function') + '; return logFehler;'
)({ error: (...a) => ausgaben.push(a) });

const axiosFehler = {
  isAxiosError: true,
  message: 'Request failed with status code 401',
  code: 'ERR_BAD_REQUEST',
  config: {
    url: '/api/fahrten',
    method: 'get',
    headers: { Authorization: 'Bearer GEHEIMES.TOKEN.HIER' },
    data: '{"username":"simon","password":"hunter2"}',
  },
  response: { status: 401, data: { message: 'Nicht angemeldet' } },
};

pruefe('das Token landet nicht im Log', () => {
  ausgaben.length = 0;
  logFehler('Test:', axiosFehler);
  assert.ok(!JSON.stringify(ausgaben).includes('GEHEIMES'),
    'der Authorization-Header darf nicht mitgeschrieben werden');
});

pruefe('das Passwort ebenso wenig', () => {
  assert.ok(!JSON.stringify(ausgaben).includes('hunter2'),
    'config.data traegt bei der Anmeldung die Zugangsdaten');
  assert.ok(!JSON.stringify(ausgaben).includes('simon'));
});

pruefe('was zum Suchen taugt, bleibt erhalten', () => {
  const inhalt = JSON.stringify(ausgaben);
  assert.ok(inhalt.includes('401'), 'Statuscode');
  assert.ok(inhalt.includes('/api/fahrten'), 'Pfad');
  assert.ok(inhalt.includes('Nicht angemeldet'), 'Meldung des Servers');
  assert.ok(inhalt.includes('ERR_BAD_REQUEST'), 'Fehlercode');
});

pruefe('der Kontext steht weiterhin vorn', () => {
  assert.strictEqual(ausgaben[0][0], 'Test:');
});

pruefe('ein Fehler ohne Anfrage wird unveraendert durchgereicht', () => {
  // Dort steckt nichts Vertrauliches, und der Stapel ist wertvoll.
  ausgaben.length = 0;
  const tf = new TypeError('x ist undefined');
  logFehler('Anderer:', tf);
  assert.strictEqual(ausgaben[0][1], tf);
});

pruefe('ein Fehler ohne response kommt ohne Absturz durch', () => {
  // Netzfehler: request gesetzt, response fehlt.
  ausgaben.length = 0;
  logFehler('Netz:', { isAxiosError: true, message: 'Network Error',
                       config: { url: '/api/orte', method: 'post' } });
  const inhalt = JSON.stringify(ausgaben);
  assert.ok(inhalt.includes('/api/orte'));
  assert.ok(inhalt.includes('Network Error'));
});

// --- 2. Die Verwendung ------------------------------------------------------
console.log('\n2 — Die Aufrufer nutzen ihn:');

function dateienDurchlaufen(verzeichnis, treffer = []) {
  for (const eintrag of fs.readdirSync(verzeichnis, { withFileTypes: true })) {
    const voll = path.join(verzeichnis, eintrag.name);
    if (eintrag.isDirectory()) dateienDurchlaufen(voll, treffer);
    else if (eintrag.name.endsWith('.js')) treffer.push(voll);
  }
  return treffer;
}

const quellen = dateienDurchlaufen(frontend + 'src');

pruefe('keine Datei mit axios protokolliert noch ein rohes Fehlerobjekt', () => {
  const muster = /console\.error\((?:'[^']*'|"[^"]*"|`[^`]*`),\s*(?:error|err|e)\)/;
  const uebrig = [];
  for (const datei of quellen) {
    const inhalt = fs.readFileSync(datei, 'utf8');
    // Nur Dateien, die ueberhaupt HTTP-Anfragen stellen.
    if (!/from 'axios'|from "axios"/.test(inhalt)) continue;
    if (muster.test(inhalt)) uebrig.push(path.relative(frontend, datei));
  }
  // client.js und tokenSpeicher.js protokollieren Speicherfehler
  // (localStorage, Keychain) — dort gibt es kein Anfrageobjekt.
  const erlaubt = ['src/api/client.js', 'src/utils/tokenSpeicher.js'];
  const unerwartet = uebrig.filter((d) => !erlaubt.includes(d));
  assert.deepStrictEqual(unerwartet, [],
    `diese Dateien schreiben noch das ganze Fehlerobjekt: ${unerwartet.join(', ')}`);
});

pruefe('der AppContext ist vollstaendig umgestellt', () => {
  const ctx = fs.readFileSync(frontend + 'src/contexts/AppContext.js', 'utf8');
  const treffer = (ctx.match(/logFehler\(/g) || []).length;
  assert.ok(treffer >= 20, `nur ${treffer} Aufrufe — erwartet waren ueber 20`);
});

pruefe('jede Datei mit logFehler importiert ihn auch', () => {
  for (const datei of quellen) {
    const inhalt = fs.readFileSync(datei, 'utf8');
    if (!/\blogFehler\(/.test(inhalt)) continue;
    if (datei.endsWith('logFehler.js')) continue;
    assert.ok(/import logFehler from '[^']*utils\/logFehler'/.test(inhalt),
      `${path.relative(frontend, datei)} nutzt logFehler ohne Import`);
  }
});

pruefe('die Import-Pfade zeigen auf eine vorhandene Datei', () => {
  for (const datei of quellen) {
    const inhalt = fs.readFileSync(datei, 'utf8');
    const m = inhalt.match(/import logFehler from '([^']+)'/);
    if (!m) continue;
    const ziel = path.resolve(path.dirname(datei), m[1] + '.js');
    assert.ok(fs.existsSync(ziel),
      `${path.relative(frontend, datei)}: ${m[1]} zeigt ins Leere`);
  }
});

// --- 3. Die bewusste Ausnahme -----------------------------------------------
console.log('\n3 — Die Anmeldung bleibt besonders sparsam:');

pruefe('der Login protokolliert weiterhin nur den Status', () => {
  const ctx = fs.readFileSync(frontend + 'src/contexts/AppContext.js', 'utf8');
  const abschnitt = ctx.split('const login = async')[1].split('\n  };')[0];
  assert.ok(/error\.response\?\.status \|\| error\.code/.test(abschnitt),
    'dort steht im Fehlerfall das Passwort im Anfragekoerper');
  assert.ok(!/logFehler\(/.test(abschnitt),
    'auch der Helfer waere hier mehr als noetig');
});

console.log('\n' + geprueft + ' Pruefungen bestanden.');
