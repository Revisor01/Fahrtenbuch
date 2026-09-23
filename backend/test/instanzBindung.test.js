// Anmeldung ist an den Kirchenkreis gebunden (24.09.2026).
//
// Befund der Pre-Launch-Pruefung: Das Token lag im Systemspeicher, die
// Server-Adresse daneben in localStorage — nichts verband beides. Nach einem
// Wechsel schickte die App das Token von Kirchenkreis A an Server B, als
// Bearer-Token, zusammen mit rund 30 weiteren Abrufen. B antwortet 401, hat
// es dann aber in seinen Protokollen: ein bei A bis zu 14 Tage gueltiges
// Token beim Betreiber eines fremden Kirchenkreises.
//
// Dazu: logout() leerte die geladenen Daten nicht. Nach dem Wechsel zeigten
// Dashboard, Fahrtenliste und Erfassung die Orte, Fahrten und Traeger von A,
// bis B geantwortet hatte — und dauerhaft, wenn B's Abruf scheiterte.
//
// Das Frontend hat kein Testframework; geprueft wird daher die Logik am
// Quelltext und der Vergleich selbst nachgebaut.

const assert = require('assert');
const fs = require('fs');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}
const liesFrontend = (pfad) =>
  fs.readFileSync(__dirname + '/../../frontend/' + pfad, 'utf8');

// Rumpf einer Funktion aus dem Quelltext schneiden — bis zum Beginn der
// naechsten Deklaration auf derselben Ebene. Eine feste Zeichenzahl haette
// bei laengeren Funktionen (fetchMonthlyData: 3286 Zeichen) danebengelegen.
function rumpfVon(quelle, name) {
  const nach = quelle.split(`const ${name} = async`)[1];
  if (!nach) return '';
  const ende = nach.indexOf('\n  const ');
  return ende > 0 ? nach.slice(0, ende) : nach;
}

// --- 1. Der Vergleich selbst ---------------------------------------------
console.log('\n1 — Wann gilt eine gespeicherte Anmeldung als passend:');

// Nachbau aus utils/tokenSpeicher.js
const gleich = (a, b) =>
  String(a || '').replace(/\/+$/, '') === String(b || '').replace(/\/+$/, '');

pruefe('VERBOTEN: Token von A gilt nicht bei B', () => {
  assert.strictEqual(gleich('https://a.example.org', 'https://b.example.org'), false);
});

pruefe('VERBOTEN: leere Zuordnung passt nicht zu einer Instanz', () => {
  // Nach der einmaligen Nachruestung traegt jede Anmeldung eine Zuordnung.
  // Steht dort etwas anderes als die aktuelle Instanz, ist sie fremd.
  assert.strictEqual(gleich('', 'https://b.example.org'), false);
});

pruefe('VERBOTEN: Token aus der App gilt nicht im Web', () => {
  // Im Web ist die Basis leer (gleicher Host wie das Frontend).
  assert.strictEqual(gleich('https://a.example.org', ''), false);
});

pruefe('ERLAUBT: dieselbe Instanz', () => {
  assert.strictEqual(gleich('https://a.example.org', 'https://a.example.org'), true);
});

pruefe('ERLAUBT: Schraegstrich am Ende macht keinen Unterschied', () => {
  assert.strictEqual(gleich('https://a.example.org/', 'https://a.example.org'), true);
  assert.strictEqual(gleich('https://a.example.org', 'https://a.example.org/'), true);
});

pruefe('ERLAUBT: Web bleibt Web (beides leer)', () => {
  assert.strictEqual(gleich('', ''), true);
});

// --- 2. Die Bindung ist im Code verankert --------------------------------
console.log('\n2 — Speicher und Start pruefen die Zuordnung:');

pruefe('es gibt einen Schluessel fuer die Zuordnung', () => {
  const q = liesFrontend('src/utils/tokenSpeicher.js');
  assert.ok(/export const SCHLUESSEL_INSTANZ/.test(q));
});

pruefe('leseAnmeldungFuer verwirft eine fremde Anmeldung', () => {
  const q = liesFrontend('src/utils/tokenSpeicher.js');
  const block = q.split('export async function leseAnmeldungFuer')[1] || '';
  assert.ok(/loescheWert\(SCHLUESSEL_TOKEN\)/.test(block), 'Token muss geloescht werden');
  assert.ok(/loescheWert\(SCHLUESSEL_USER\)/.test(block), 'Nutzerdaten muessen mit');
  assert.ok(/verworfen: true/.test(block), 'der Aufrufer muss es erfahren');
});

pruefe('der Start nutzt die gepruefte Variante, nicht das rohe Token', () => {
  const q = liesFrontend('src/contexts/AppContext.js');
  assert.ok(/leseAnmeldungFuer\(getApiBaseUrl\(\)\)/.test(q));
});

pruefe('beim Anmelden wird die Instanz notiert', () => {
  const q = liesFrontend('src/contexts/AppContext.js');
  assert.ok(
    /schreibeWert\(SCHLUESSEL_INSTANZ, String\(getApiBaseUrl\(\)/.test(q),
    'ohne Notiz wuerde die eigene Anmeldung beim naechsten Start verworfen'
  );
});

// --- 3. Abmelden raeumt wirklich auf --------------------------------------
console.log('\n3 — Nach dem Abmelden bleibt nichts von A stehen:');

pruefe('alle Datenlisten werden geleert', () => {
  const q = liesFrontend('src/contexts/AppContext.js');
  const block = q.split('const logout = ')[1].split('};')[0];
  for (const setter of [
    'setOrte([])',
    'setFahrten([])',
    'setMonthlyData([])',
    'setDistanzen([])',
    'setAbrechnungstraeger([])',
    'setFavoriten([])',
    'setAnlaesse([])',
  ]) {
    assert.ok(block.includes(setter), `${setter} fehlt in logout()`);
  }
  assert.ok(/setSummary\(\{\}\)/.test(block), 'setSummary({}) fehlt');
});

pruefe('Token, Nutzerdaten und Zuordnung werden zusammen entfernt', () => {
  const q = liesFrontend('src/utils/tokenSpeicher.js');
  const block = q.split('export async function loescheAnmeldung')[1] || '';
  assert.ok(/SCHLUESSEL_TOKEN/.test(block));
  assert.ok(/SCHLUESSEL_USER/.test(block));
  assert.ok(/SCHLUESSEL_INSTANZ/.test(block));
});

pruefe('der Authorization-Header faellt mit', () => {
  const q = liesFrontend('src/contexts/AppContext.js');
  const block = q.split('const logout = ')[1].split('};')[0];
  assert.ok(/delete axios\.defaults\.headers\.common\['Authorization'\]/.test(block));
});

// --- 4. Bestandsanmeldungen werden nicht ausgesperrt ----------------------
console.log('\n4 — Das Update meldet niemanden ohne Not ab:');

pruefe('eine Anmeldung ohne Zuordnung wird einmalig nachgeruestet', () => {
  const q = liesFrontend('src/utils/tokenSpeicher.js');
  const block = q.split('export async function leseAnmeldungFuer')[1] || '';
  assert.ok(
    /notiert === null \|\| notiert === undefined/.test(block),
    'der Fall "noch keine Zuordnung" muss eigens behandelt werden'
  );
  assert.ok(
    /schreibeWert\(SCHLUESSEL_INSTANZ/.test(block),
    'die Zuordnung muss dabei nachgetragen werden'
  );
  // Die Begruendung muss im Code stehen, sonst sieht das wie eine Luecke aus.
  assert.ok(/Wechsel meldet ab/.test(block), 'Begruendung fehlt');
});

// --- 5. Spaete Antworten von A ueberschreiben B nicht --------------------
console.log('\n5 — Antworten aus einer beendeten Sitzung werden verworfen:');

// Bisher prueften das nur die Nutzerdaten. Die uebrigen Abrufe schrieben
// blind — und behielten dabei Basis-URL und Header von A, weil axios die
// Vorgaben beim Aufruf mischt, nicht beim Versand.

pruefe('es gibt einen gemeinsamen Waechter', () => {
  const q = liesFrontend('src/contexts/AppContext.js');
  assert.ok(/const sitzungVorbei = /.test(q));
});

pruefe('alle sechs Abrufe fassen die Sitzung und pruefen sie', () => {
  const q = liesFrontend('src/contexts/AppContext.js');
  for (const fn of [
    'fetchFavoriten',
    'fetchAnlaesse',
    'fetchOrte',
    'fetchDistanzen',
    'fetchFahrten',
    'fetchMonthlyData',
  ]) {
    const kopf = rumpfVon(q, fn);
    assert.ok(kopf, `${fn} nicht gefunden`);
    assert.ok(
      /const sitzung = sitzungsZaehler\.current/.test(kopf),
      `${fn} merkt sich die Sitzung nicht`
    );
    assert.ok(/sitzungVorbei\(sitzung\)/.test(kopf), `${fn} prueft sie nicht`);
  }
});

pruefe('auch die Fehlerzweige schreiben nichts mehr zurueck', () => {
  // Sonst leerte ein spaeter Fehler von A die frisch geladenen Daten von B.
  const q = liesFrontend('src/contexts/AppContext.js');
  for (const fn of ['fetchFavoriten', 'fetchDistanzen', 'fetchFahrten']) {
    const catchTeil = rumpfVon(q, fn).split('} catch')[1] || '';
    assert.ok(
      /sitzungVorbei\(sitzung\)/.test(catchTeil.slice(0, 400)),
      `${fn}: der catch-Zweig prueft die Sitzung nicht`
    );
  }
});

pruefe('Listen werden nur als Array uebernommen', () => {
  // Liefert der Server etwas anderes, warf .map/.filter spaeter einen
  // TypeError — derselbe Fehler, der in einem anderen Projekt die Apps
  // nach dem Login abstuerzen liess.
  const q = liesFrontend('src/contexts/AppContext.js');
  for (const fn of ['fetchOrte', 'fetchDistanzen', 'fetchFavoriten']) {
    const block = rumpfVon(q, fn);
    assert.ok(/Array\.isArray\(response\.data\)/.test(block), `${fn} prueft die Form nicht`);
  }
});

console.log('\n' + geprueft + ' Pruefungen bestanden.\n');
