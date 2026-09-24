// Punkt 9 der Pre-Launch-Liste: Die Fehlergrenze umschloss nur AppContent.
//
// Sie stand als Element der Route `/*`. Alles darueber war ungeschuetzt:
// PwaUpdater, ErfassungsFlow und StatusDatumSheet (die rendern ihre
// Provider, nicht App.js), die oeffentlichen Routen /help, /rechtliches,
// /verify-email, /reset-password, /set-password — und die Provider-Ruempfe
// selbst. Ein Render-Fehler dort ergab eine weisse Seite.
//
// /rechtliches ist der heikelste Fall: Apple-Pruefer:innen rufen sie ohne
// Konto auf (Apple 5.1.1 (i), Kommentar in App.js).
//
// Ausserdem bot die Anzeige keinen Ausweg — nur den Satz „Bitte die App
// einmal schliessen und neu oeffnen", der im Browser nicht weiterhilft.
//
// Geprueft wird die Verschachtelung per Quelltext: Es gibt kein
// Frontend-Testframework im Repo, und ein Render-Test brauchte React-DOM.
//
// Laeuft ohne Test-Framework: `node test/fehlergrenze.test.js`.

const assert = require('assert');
const fs = require('fs');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

const app = fs.readFileSync(__dirname + '/../../frontend/src/App.js', 'utf8');
const grenze = fs.readFileSync(
  __dirname + '/../../frontend/src/components/Fehlergrenze.js', 'utf8');
const css = fs.readFileSync(__dirname + '/../../frontend/src/index.css', 'utf8');

// --- 1. Die Fehlergrenze liegt aussen -------------------------------------
console.log('\n1 — Umfang der Fehlergrenze:');

// Position der Bausteine im JSX. Wer weiter vorne steht, umschliesst.
const pos = (nadel) => app.indexOf(nadel);

pruefe('die Fehlergrenze steht nicht mehr in der Route', () => {
  assert.ok(!/<Fehlergrenze><AppContent \/><\/Fehlergrenze>/.test(app),
    'als Route-Element schuetzt sie nur AppContent');
});

pruefe('sie oeffnet vor dem Router und schliesst danach', () => {
  const auf = pos('<Fehlergrenze>');
  const zu = pos('</Fehlergrenze>');
  assert.ok(auf > -1 && zu > auf, 'Fehlergrenze muss den Baum umschliessen');
  assert.ok(auf < pos('<BrowserRouter>'), 'vor dem Router');
  assert.ok(zu > pos('</BrowserRouter>'), 'nach dem Router');
});

pruefe('sie liegt innerhalb des ThemeProviders', () => {
  // Sonst erscheint die Meldung ohne Farbschema.
  assert.ok(pos('<ThemeProvider>') < pos('<Fehlergrenze>'));
  assert.ok(pos('</Fehlergrenze>') < pos('</ThemeProvider>'));
});

for (const [name, nadel] of [
  ['PwaUpdater', '<PwaUpdater />'],
  ['der ToastProvider', '<ToastProvider>'],
  ['der AppProvider (rendert StatusDatumSheet)', '<AppProvider>'],
  ['der ErfassungProvider (rendert ErfassungsFlow)', '<ErfassungProvider>'],
  ['die Routen', '<Routes>'],
]) {
  pruefe(`${name} liegt innerhalb der Fehlergrenze`, () => {
    const stelle = pos(nadel);
    assert.ok(stelle > -1, `${nadel} nicht gefunden`);
    assert.ok(stelle > pos('<Fehlergrenze>') && stelle < pos('</Fehlergrenze>'),
      `${name} war vorher ungeschuetzt und muss jetzt drinliegen`);
  });
}

for (const route of ['/help', '/rechtliches', '/verify-email', '/reset-password', '/set-password']) {
  pruefe(`die oeffentliche Route ${route} liegt innerhalb der Fehlergrenze`, () => {
    const stelle = app.indexOf(`path="${route}"`);
    assert.ok(stelle > -1, `Route ${route} nicht gefunden`);
    assert.ok(stelle > pos('<Fehlergrenze>') && stelle < pos('</Fehlergrenze>'));
  });
}

// --- 2. Die Anzeige bietet einen Ausweg -----------------------------------
console.log('\n2 — Die Anzeige:');

pruefe('es gibt einen Knopf, der neu laedt', () => {
  assert.ok(/<button/.test(grenze), 'ohne Knopf bleibt nur das Schliessen der App');
  assert.ok(/window\.location\.reload\(\)/.test(grenze));
});

pruefe('der Knopf hat eine Trefferflaeche nach Norm', () => {
  const regel = css.split('.startbildschirm-knopf {')[1].split('}')[0];
  assert.ok(/min-height: var\(--tap-min\)/.test(regel),
    'der Knopf ist der einzige Ausweg — er muss sicher treffbar sein');
});

pruefe('die Knopffarben sind fest verdrahtet, nicht ueber Marken-Token', () => {
  const regel = css.split('.startbildschirm-knopf {')[1].split('}')[0];
  assert.ok(!/var\(--brand-strong\)/.test(regel),
    'die Flaeche bleibt in beiden Designs Petrol; --brand-strong kippt im '
    + 'dunklen ins Helle und waere auf Weiss unlesbar');
});

pruefe('der alte Satz „schliessen und neu oeffnen" steht nicht mehr da', () => {
  assert.ok(!/schließen und neu öffnen/.test(grenze),
    'im Browser hilft dieser Rat nicht weiter');
});

pruefe('die Fehlermeldung erscheint nur bei der Entwicklung', () => {
  const stelle = grenze.indexOf('startbildschirm-fehler');
  assert.ok(stelle > -1, 'die Ausgabe soll es weiterhin geben');
  const davor = grenze.slice(Math.max(0, stelle - 300), stelle);
  assert.ok(/import\.meta\.env\?\.DEV/.test(davor),
    'sonst sehen Apple-Pruefer:innen ein Stacktrace-Fragment');
});

pruefe('die Fehlergrenze bleibt eine Klassenkomponente mit beiden Haken', () => {
  // getDerivedStateFromError faengt den Fehler, componentDidCatch protokolliert.
  assert.ok(/static getDerivedStateFromError/.test(grenze));
  assert.ok(/componentDidCatch/.test(grenze));
});

console.log('\n' + geprueft + ' Pruefungen bestanden.');
