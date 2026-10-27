// Ladefehler zeigen keine leere Liste, der erzwungene Logout meldet sich einmal und schließt offene Sheets. Aufruf: node test/sitzungUndLadefehler.test.js

const assert = require('assert');
const fs = require('fs');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

const basis = __dirname + '/../../frontend/src/';
const lies = (p) => fs.readFileSync(basis + p, 'utf8');

const ctx = lies('contexts/AppContext.js');
const erfCtx = lies('contexts/ErfassungContext.js');
const liste = lies('components/FahrtenListe.js');
const appContent = lies('components/AppContent.js');

// --- 1. Der Guard ---------------------------------------------------------
console.log('\n1 — Der isLoggingOut-Guard haelt jetzt:');

const logoutRumpf = ctx.split('const logout = (')[1].split('\n  };')[0];

pruefe('logout() setzt den Guard NICHT mehr zurueck', () => {
  assert.ok(!/isLoggingOut\.current = false/.test(logoutRumpf),
    'sonst greift er beim zweiten der ~35 parallelen 401 nicht mehr');
});

pruefe('login() setzt ihn zurueck', () => {
  const loginRumpf = ctx.split('const login = async')[1].split('\n  };')[0];
  assert.ok(/isLoggingOut\.current = false/.test(loginRumpf),
    'ohne Ruecksetzung bliebe nach einem Logout jeder weitere 401 stumm');
});

pruefe('der Interceptor setzt ihn weiterhin vor dem Logout', () => {
  const abschnitt = ctx.split('status === 401')[1].slice(0, 300);
  assert.ok(/isLoggingOut\.current = true/.test(abschnitt));
  assert.ok(abschnitt.indexOf('isLoggingOut.current = true')
    < abschnitt.indexOf('logout('), 'erst sperren, dann abmelden');
});

// --- 2. Der Logout meldet sich ---------------------------------------------
console.log('\n2 — Abgelaufene Sitzung wird gemeldet:');

pruefe('logout nimmt einen Grund an', () => {
  assert.ok(/const logout = \(\{ grund \} = \{\}\) =>/.test(ctx),
    'der Vorgabewert {} ist noetig — logout() wird auch ohne Argument gerufen');
});

pruefe('nur der erzwungene Logout zeigt eine Meldung', () => {
  assert.ok(/if \(grund === 'abgelaufen'\)/.test(logoutRumpf),
    'das bewusste Abmelden ueber den Knopf braucht keine Fehlermeldung');
  const zweig = logoutRumpf.split("grund === 'abgelaufen'")[1].slice(0, 200);
  assert.ok(/toast\.error/.test(zweig));
});

pruefe('der Interceptor gibt den Grund mit', () => {
  assert.ok(/logout\(\{ grund: 'abgelaufen' \}\)/.test(ctx));
});

pruefe('der 60-s-Timer gibt den Grund mit — in beiden Zweigen', () => {
  const treffer = appContent.match(/logout\(\{ grund: 'abgelaufen' \}\)/g) || [];
  assert.strictEqual(treffer.length, 2,
    'abgelaufener UND unlesbarer Token muessen gemeldet werden');
});

pruefe('das bewusste Abmelden laeuft ohne Grund', () => {
  // Grund explizit statt des Click-Events.
  assert.ok(!/onClick=\{logout\}/.test(appContent),
    'logout darf nicht direkt als Handler haengen');
  const einst = lies('components/einstellungen/EinstellungenView.js');
  assert.ok(!/onClick=\{logout\}/.test(einst));
  assert.ok(/onClick=\{\(\) => logout\(\)\}/.test(appContent));
});

// --- 3. Offene Sheets verschwinden beim Abmelden ---------------------------
console.log('\n3 — Kein Sheet ueber der Anmeldemaske:');

pruefe('logout schliesst das Status-Fenster', () => {
  assert.ok(/setAbrechnungsStatusModal\(\{ open: false \}\)/.test(logoutRumpf),
    'es wird vom AppProvider gerendert und ueberlebt den Wechsel');
});

pruefe('der ErfassungProvider schliesst beim Abmelden', () => {
  assert.ok(/useContext\(AppContext\)/.test(erfCtx),
    'er muss isLoggedIn lesen');
  assert.ok(/if \(!isLoggedIn\) close\(\)/.test(erfCtx));
  assert.ok(/useEffect/.test(erfCtx) && /from 'react'/.test(erfCtx));
});

pruefe('der Zugriff auf den Context ist abgesichert', () => {
  // Ein fehlender Context darf kein TypeError werden.
  assert.ok(/useContext\(AppContext\) \|\| \{\}/.test(erfCtx));
});

// --- 4. Ladefehler sieht nicht nach „nichts da" aus ------------------------
console.log('\n4 — Netzfehler wird als Fehler gezeigt:');

pruefe('es gibt einen fahrtenFehler-Zustand', () => {
  assert.ok(/const \[fahrtenFehler, setFahrtenFehler\] = useState\(null\)/.test(ctx));
  assert.ok(/\n      fahrtenFehler,/.test(ctx), 'muss im Context stehen');
});

pruefe('der catch-Zweig meldet und merkt sich den Fehler', () => {
  const abschnitt = ctx.split("Fehler beim Abrufen der Fahrten")[1].slice(0, 700);
  assert.ok(/setFahrtenFehler\(/.test(abschnitt));
  assert.ok(/toast\.error\(/.test(abschnitt));
  assert.ok(/fehlerText\(/.test(abschnitt),
    'fehlerText benennt Zeitgrenze und fehlende Verbindung getrennt');
});

pruefe('bei 401 kommt kein zweiter Toast', () => {
  const abschnitt = ctx.split("Fehler beim Abrufen der Fahrten")[1].slice(0, 700);
  assert.ok(/status !== 401/.test(abschnitt),
    'der Interceptor meldet den Sitzungsablauf bereits selbst');
});

pruefe('ein erfolgreicher Abruf loescht den Fehler', () => {
  const abschnitt = ctx.split('setSummary(response?.data?.summary')[1].slice(0, 200);
  assert.ok(/setFahrtenFehler\(null\)/.test(abschnitt),
    'sonst bleibt die Fehleranzeige nach dem naechsten Laden stehen');
});

pruefe('fehlerText ist importiert', () => {
  assert.ok(/import fehlerText from '\.\.\/utils\/fehlerText'/.test(ctx));
});

pruefe('die Liste unterscheidet Fehler von „keine Fahrten"', () => {
  assert.ok(/sortierteFahrten\.length === 0 && fahrtenFehler/.test(liste),
    'der Fehlerfall muss VOR dem Leerfall geprueft werden');
  const fehlerZweig = liste.split('sortierteFahrten.length === 0 && fahrtenFehler')[1].slice(0, 600);
  assert.ok(/Die Fahrten konnten nicht geladen werden/.test(fehlerZweig));
  assert.ok(/actionLabel="Erneut versuchen"/.test(fehlerZweig));
  assert.ok(/onAction=\{\(\) => fetchFahrten\(\)\}/.test(fehlerZweig));
});

pruefe('der alte Leertext steht nur noch im Leerfall', () => {
  const stelleFehler = liste.indexOf('sortierteFahrten.length === 0 && fahrtenFehler');
  // Auf den JSX-Ausdruck prüfen, nicht auf den Satz.
  const stelleLeer = liste.indexOf('`Noch keine Fahrten im ${monatLabel');
  assert.ok(stelleFehler > -1 && stelleLeer > stelleFehler,
    'der Leertext darf erst nach der Fehlerpruefung kommen');
});

console.log('\n' + geprueft + ' Pruefungen bestanden.');
