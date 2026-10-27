// Feste Anfragefolge gegen ein laufendes Backend mit frischer Datenbank.
// Schreibt je Schritt Status und Form der Antwort (Typen und Schluessel,
// keine Werte) als JSON. vergleich.js prueft damit, dass eine neue Fassung
// die Antworten so liefert, wie die ausgelieferten Apps sie lesen.
//
// Aufruf: node test/vertrag/anfragefolge.js <basis-url> <ausgabe.json>
// Erwartet den Erst-Admin aus INITIAL_ADMIN_USERNAME / INITIAL_ADMIN_PASSWORD.

const fs = require('fs');

const [basis, ausgabe] = process.argv.slice(2);
if (!basis || !ausgabe) {
  console.error('Aufruf: node anfragefolge.js <basis-url> <ausgabe.json>');
  process.exit(2);
}

function form(wert) {
  if (wert === null) return 'null';
  if (Array.isArray(wert)) {
    let element = null;
    for (const e of wert) element = vereinige(element, form(e));
    return { array: element };
  }
  if (typeof wert === 'object') {
    const ergebnis = {};
    for (const k of Object.keys(wert).sort()) ergebnis[k] = form(wert[k]);
    return { object: ergebnis };
  }
  return typeof wert;
}

function vereinige(a, b) {
  if (a === null) return b;
  if (JSON.stringify(a) === JSON.stringify(b)) return a;
  if (a.object && b.object) {
    const o = { ...a.object };
    for (const [k, v] of Object.entries(b.object)) o[k] = k in o ? vereinige(o[k], v) : v;
    return { object: o };
  }
  const liste = new Set([...(a.oneOf || [JSON.stringify(a)]), ...(b.oneOf || [JSON.stringify(b)])]);
  return { oneOf: [...liste].sort() };
}

const protokoll = [];
// Mit VERTRAG_INHALT=<datei> zusaetzlich die vollen Antworten, etwa als
// Testdaten fuer Oberflaechenvergleiche ohne Datenbank.
const inhalte = [];
let token = null;

async function anfrage(schritt, methode, pfad, { body, ohneToken, kopf = {}, rohBody } = {}) {
  const headers = { ...kopf };
  if (token && !ohneToken) headers.Authorization = `Bearer ${token}`;
  let daten;
  if (rohBody !== undefined) {
    daten = rohBody;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    daten = JSON.stringify(body);
  }
  const antwort = await fetch(basis + pfad, { method: methode, headers, body: daten });
  const typ = (antwort.headers.get('content-type') || '').split(';')[0];
  let inhalt = null;
  let eintrag;
  if (typ === 'application/json') {
    inhalt = await antwort.json();
    inhalte.push({ schritt, methode, pfad, status: antwort.status, inhalt });
    eintrag = { schritt, methode, pfad, status: antwort.status, typ, form: form(inhalt) };
  } else {
    const puffer = Buffer.from(await antwort.arrayBuffer());
    eintrag = { schritt, methode, pfad, status: antwort.status, typ, leer: puffer.length === 0 };
  }
  protokoll.push(eintrag);
  return inhalt;
}

(async () => {
  const admin = process.env.INITIAL_ADMIN_USERNAME;
  const passwort = process.env.INITIAL_ADMIN_PASSWORD;

  await anfrage('instanzen', 'GET', '/api/instanzen');
  await anfrage('konfig', 'GET', '/api/konfig');
  await anfrage('login-falsch', 'POST', '/api/auth/login', { body: { username: admin, password: 'falsch-falsch' } });
  await anfrage('login-leer', 'POST', '/api/auth/login', { body: {} });
  await anfrage('login-ohne-koerper', 'POST', '/api/auth/login');
  const login = await anfrage('login', 'POST', '/api/auth/login', { body: { username: admin, password: passwort } });
  token = login.token;
  await anfrage('ohne-anmeldung', 'GET', '/api/orte', { ohneToken: true });

  await anfrage('me', 'GET', '/api/users/me');
  await anfrage('profil', 'GET', '/api/profile');
  await anfrage('profil-aendern', 'PUT', '/api/profile', { body: { email: 'admin@example.org', fullName: 'Vertrag Test', iban: null, kirchengemeinde: 'Heide', kirchspiel: null, kirchenkreis: 'Dithmarschen' } });
  await anfrage('profil-ohne-koerper', 'PUT', '/api/profile');
  await anfrage('profil-teilweise', 'PUT', '/api/profile', { body: { kirchspiel: 'West' } });
  await anfrage('konto-loeschen-ohne-koerper', 'DELETE', '/api/profile');
  await anfrage('benutzer', 'GET', '/api/users');

  await anfrage('orte-start', 'GET', '/api/orte');
  const a = await anfrage('ort-a', 'POST', '/api/orte', { body: { name: 'Heide', adresse: 'Markt 1, 25746 Heide', istWohnort: true } });
  const b = await anfrage('ort-b', 'POST', '/api/orte', { body: { name: 'Meldorf', adresse: 'Domstr. 1, 25704 Meldorf', istDienstort: true } });
  await anfrage('ort-fehler', 'POST', '/api/orte', { body: { name: '' } });
  await anfrage('orte', 'GET', '/api/orte');
  await anfrage('orte-einfach', 'GET', '/api/orte/simple');
  await anfrage('ort', 'GET', `/api/orte/${a.id}`);
  await anfrage('ort-aendern', 'PUT', `/api/orte/${a.id}`, { body: { name: 'Heide', adresse: 'Markt 2, 25746 Heide', ist_wohnort: true } });
  await anfrage('orte-sortieren', 'PUT', '/api/orte/sort', { body: { sortOrder: [{ id: a.id, sort_order: 1 }, { id: b.id, sort_order: 0 }] } });
  await anfrage('orte-sortieren-ohne-koerper', 'PUT', '/api/orte/sort');

  const d = await anfrage('distanz', 'POST', '/api/distanzen', { body: { vonOrtId: a.id, nachOrtId: b.id, distanz: 18.5 } });
  await anfrage('distanzen', 'GET', '/api/distanzen');
  await anfrage('distanz-zwischen', 'GET', `/api/distanzen/between?vonOrtId=${a.id}&nachOrtId=${b.id}`);
  await anfrage('distanz-zwischen-fehlt', 'GET', '/api/distanzen/between');
  if (d && d.id) await anfrage('distanz-aendern', 'PUT', `/api/distanzen/${d.id}`, { body: { vonOrtId: a.id, nachOrtId: b.id, distanz: 19 } });

  await anfrage('traeger-start', 'GET', '/api/abrechnungstraeger');
  const t = await anfrage('traeger', 'POST', '/api/abrechnungstraeger', { body: { name: 'Kirchengemeinde Heide', kostenstelle: '4711', farbe: '#336699' } });
  const traegerId = t.id || (t.traeger && t.traeger.id);
  await anfrage('traeger-liste', 'GET', '/api/abrechnungstraeger');
  await anfrage('traeger-einfach', 'GET', '/api/abrechnungstraeger/simple');
  await anfrage('traeger-einzeln', 'GET', `/api/abrechnungstraeger/${traegerId}`);
  await anfrage('traeger-satz', 'POST', `/api/abrechnungstraeger/${traegerId}/erstattung`, { body: { betrag: 0.3, gueltig_ab: '2026-01-01' } });
  await anfrage('traeger-historie', 'GET', `/api/abrechnungstraeger/${traegerId}/historie`);
  await anfrage('traeger-aendern', 'PUT', `/api/abrechnungstraeger/${traegerId}`, { body: { name: 'Kirchengemeinde Heide', kostenstelle: '4712', farbe: '#336699', active: true } });

  await anfrage('mitfahrer-satz-aktuell', 'GET', '/api/mitfahrer-erstattung/current');
  await anfrage('mitfahrer-satz', 'POST', '/api/mitfahrer-erstattung', { body: { betrag: 0.05, gueltig_ab: '2026-01-01' } });
  await anfrage('mitfahrer-satz-historie', 'GET', '/api/mitfahrer-erstattung/historie');

  await anfrage('anlaesse-start', 'GET', '/api/anlaesse');
  const an = await anfrage('anlass', 'POST', '/api/anlaesse', { body: { name: 'Besuch' } });
  if (an && an.id) await anfrage('anlass-aendern', 'PUT', `/api/anlaesse/${an.id}`, { body: { aktiv: true } });
  await anfrage('anlaesse', 'GET', '/api/anlaesse');

  const f = await anfrage('fahrt', 'POST', '/api/fahrten', { body: {
    vonOrtId: a.id, nachOrtId: b.id, datum: '2026-10-01', anlass: 'Besuch', abrechnung: traegerId,
    mitfahrer: [{ name: 'Erika Muster', arbeitsstaette: 'Heide', richtung: 'hin_rueck' }],
  } });
  const fahrtId = f.id || (f.fahrt && f.fahrt.id);
  await anfrage('fahrt-einmalig', 'POST', '/api/fahrten', { body: {
    datum: '2026-10-02', anlass: 'Tagung', kilometer: 42, abrechnung: traegerId,
    einmaligerVonOrt: 'Heide', einmaligerNachOrt: 'Kiel',
  } });
  await anfrage('fahrt-leer', 'POST', '/api/fahrten', { body: {} });
  await anfrage('fahrt-ohne-koerper', 'POST', '/api/fahrten');
  await anfrage('fahrten', 'GET', '/api/fahrten');
  await anfrage('fahrt-einzeln', 'GET', `/api/fahrten/${fahrtId}`);
  await anfrage('fahrt-aendern', 'PUT', `/api/fahrten/${fahrtId}`, { body: {
    vonOrtId: a.id, nachOrtId: b.id, datum: '2026-10-01', anlass: 'Besuch lang', abrechnung: traegerId,
    mitfahrer: [{ name: 'Erika Muster', arbeitsstaette: 'Heide', richtung: 'hin_rueck' }],
  } });
  const m = await anfrage('mitfahrer', 'POST', `/api/fahrten/${fahrtId}/mitfahrer`, { body: { name: 'Max Muster', arbeitsstaette: 'Meldorf', richtung: 'hin' } });
  await anfrage('mitfahrer-ohne-arbeitsstaette', 'POST', `/api/fahrten/${fahrtId}/mitfahrer`, { body: { name: 'Ohne Ort', richtung: 'hin' } });
  if (m && m.id) await anfrage('mitfahrer-aendern', 'PUT', `/api/fahrten/${fahrtId}/mitfahrer/${m.id}`, { body: { name: 'Max Muster', arbeitsstaette: 'Meldorf', richtung: 'rueck' } });
  await anfrage('bericht', 'GET', '/api/fahrten/report/2026/10');
  await anfrage('bericht-fehler', 'GET', '/api/fahrten/report/1999/13');
  await anfrage('monatsuebersicht', 'GET', '/api/fahrten/monthly-summary');
  await anfrage('jahresuebersicht', 'GET', '/api/fahrten/year-summary/2026');
  await anfrage('bericht-zeitraum', 'GET', '/api/fahrten/report-range/2026/9/2026/10');
  await anfrage('status-eingereicht', 'POST', '/api/fahrten/abrechnungsstatus', { body: { jahr: 2026, monat: 10, typ: traegerId, aktion: 'eingereicht', datum: '2026-10-27' } });
  await anfrage('status-ohne-koerper', 'POST', '/api/fahrten/abrechnungsstatus');
  await anfrage('export-xlsx', 'GET', `/api/fahrten/export/${traegerId}/2026/10`);

  const fav = await anfrage('favorit', 'POST', '/api/favoriten', { body: { vonOrtId: a.id, nachOrtId: b.id, anlass: 'Besuch', abrechnungstraegerId: traegerId } });
  await anfrage('favorit-ohne-koerper', 'POST', '/api/favoriten');
  await anfrage('favoriten', 'GET', '/api/favoriten');
  const favId = fav && (fav.id || (fav.favorit && fav.favorit.id));
  if (favId) {
    await anfrage('favorit-ausfuehren-ohne-koerper', 'POST', `/api/favoriten/${favId}/execute`);
    await anfrage('favorit-ausfuehren-rueck', 'POST', `/api/favoriten/${favId}/execute`, { body: { mitRueckfahrt: true } });
  }

  const key = await anfrage('schluessel', 'POST', '/api/keys', { body: { description: 'Kurzbefehl' } });
  await anfrage('schluessel-liste', 'GET', '/api/keys');
  if (key && key.key) {
    const gemerkt = token;
    token = null;
    await anfrage('schluessel-test', 'GET', '/api/keys/test', { kopf: { 'X-API-Key': key.key } });
    await anfrage('schluessel-fahrten', 'GET', '/api/fahrten', { kopf: { 'X-API-Key': key.key } });
    token = gemerkt;
  }

  await anfrage('kaputtes-json', 'POST', '/api/orte', { rohBody: '{"name":', kopf: { 'Content-Type': 'application/json' } });
  await anfrage('unbekannt-api', 'GET', '/api/gibt-es-nicht');
  await anfrage('unbekannt-seite', 'GET', '/irgendeine/seite');
  await anfrage('fahrt-loeschen', 'DELETE', `/api/fahrten/${fahrtId}`);

  fs.writeFileSync(ausgabe, JSON.stringify(protokoll, null, 2) + '\n');
  if (process.env.VERTRAG_INHALT) fs.writeFileSync(process.env.VERTRAG_INHALT, JSON.stringify(inhalte, null, 2) + '\n');
  console.log(`${protokoll.length} Anfragen protokolliert: ${ausgabe}`);
})().catch((fehler) => {
  console.error(fehler);
  fs.writeFileSync(ausgabe, JSON.stringify(protokoll, null, 2) + '\n');
  process.exit(1);
});
