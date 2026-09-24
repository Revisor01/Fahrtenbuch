// Punkt 14 (Zugaenglichkeit) und die verbliebenen Betriebspunkte aus 12.
//
// Zielgruppe dieser App sind kirchliche Mitarbeitende quer durch alle
// Altersgruppen — Beschriftungen und Trefferflaechen sind hier keine
// Formsache.
//
// Der Healthcheck-Befund wurde nachgemessen: `mysqladmin ping -h localhost`
// ohne Zugangsdaten antwortet „Access denied for user 'root'@'localhost'"
// und beendet sich trotzdem mit Exit-Code 0. Der Container galt damit als
// gesund, sobald das Netz stand — und das Backend startet ueber
// `depends_on: service_healthy` genau darauf hin.
//
// Laeuft ohne Test-Framework: `node test/zugaenglichkeitUndBetrieb.test.js`.

const assert = require('assert');
const fs = require('fs');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

const wurzel = __dirname + '/../../';
const lies = (p) => fs.readFileSync(wurzel + p, 'utf8');

// --- 1. Beschriftungen ----------------------------------------------------
console.log('\n1 — Jedes Eingabefeld hat eine Beschriftung:');

const modal = lies('frontend/src/MitfahrerModal.js');
const form = lies('frontend/src/FahrtForm.js');

pruefe('die Mitfahrer-Felder sind verbunden', () => {
  for (const id of ['mitfahrer-name', 'mitfahrer-arbeitsstaette']) {
    assert.ok(new RegExp(`htmlFor="${id}"`).test(modal), `label fuer ${id}`);
    assert.ok(new RegExp(`id="${id}"`).test(modal), `input ${id}`);
  }
});

pruefe('die Felder im Ort-Speichern-Fenster ebenso', () => {
  for (const id of ['ort-adresse', 'ort-name', 'ort-typ']) {
    assert.ok(new RegExp(`htmlFor="${id}"`).test(form), `label fuer ${id}`);
    assert.ok(new RegExp(`id="${id}"`).test(form), `feld ${id}`);
  }
});

pruefe('kein <label> vor einem Eingabefeld bleibt unverbunden', () => {
  // Nur echte <label>-Elemente pruefen: In InfoModal und NewFeaturesModal
  // traegt die Klasse form-label reine <div>-Ueberschriften, zu denen es
  // kein Feld gibt.
  const dateien = ['frontend/src/MitfahrerModal.js', 'frontend/src/FahrtForm.js',
                   'frontend/src/components/einstellungen/FavoritenBereich.js',
                   'frontend/src/components/einstellungen/SatzBausteine.js'];
  for (const datei of dateien) {
    const inhalt = lies(datei);
    for (const zeile of inhalt.split('\n')) {
      const t = zeile.trim();
      if (!t.startsWith('<label')) continue;
      assert.ok(/htmlFor=|id=/.test(t),
        `${datei}: ${t.slice(0, 60)} — ohne htmlFor liest der Screenreader nur „Eingabefeld"`);
    }
  }
});

// --- 2. Trefferflaechen ----------------------------------------------------
console.log('\n2 — Trefferflaechen nach Norm:');

const css = lies('frontend/src/index.css');

pruefe('der Token --tap-min existiert und liegt bei 44px', () => {
  const tokens = lies('frontend/src/tokens.css');
  assert.ok(/--tap-min:\s*44px/.test(tokens));
});

pruefe('die drei kleinen Knoepfe bekommen eine groessere Flaeche', () => {
  const block = css.split('.dash-uw-btn::after,')[1];
  assert.ok(block, 'die Regel muss existieren');
  assert.ok(/min-width: var\(--tap-min\)/.test(block.split('}')[0]));
  assert.ok(/min-height: var\(--tap-min\)/.test(block.split('}')[0]));
});

pruefe('das Aussehen bleibt unveraendert', () => {
  // Die sichtbaren Groessen sind Teil des Entwurfs — nur die Flaeche waechst,
  // ueber ein unsichtbares Pseudoelement.
  assert.ok(/\.dash-uw-btn \{[^}]*width: 34px/s.test(css), 'dash-uw-btn bleibt 34px');
  assert.ok(/\.set-action \{[^}]*width: 36px/s.test(css), 'set-action bleibt 36px');
  const block = css.split('.dash-uw-btn::after,')[1].split('}')[0];
  assert.ok(!/background/.test(block), 'das Pseudoelement darf nichts verdecken');
});

pruefe('die Knoepfe sind positioniert, sonst greift das Pseudoelement nicht', () => {
  // Auf den Regelblock selbst pruefen, nicht auf den Text: „position:
  // relative" steht auch im erklaerenden Kommentar darueber.
  const regel = css.match(/\.dash-uw-btn,\s*\n\.set-action,\s*\n\.set-grip \{([^}]*)\}/);
  assert.ok(regel, 'der gemeinsame Regelblock fehlt');
  assert.ok(/position:\s*relative/.test(regel[1]));
});

pruefe('der Sortiergriff waechst nur in der Breite', () => {
  // In der Hoehe lagen die Flaechen benachbarter Listenzeilen sonst
  // uebereinander, und ein Zug an der Grenze erwischte die falsche Zeile.
  // Die eigene Regel steht NACH dem gemeinsamen Block und ueberschreibt ihn
  // — deshalb den letzten Treffer nehmen, nicht den ersten.
  const block = css.split('.set-grip::after {').pop().split('}')[0];
  assert.ok(/min-height: 0/.test(block),
    'ohne das liegen die Flaechen benachbarter Zeilen uebereinander');
  // Reihenfolge zaehlt: eine spaetere Regel gewinnt.
  const gemeinsam = css.indexOf('.dash-uw-btn::after,');
  const eigen = css.lastIndexOf('.set-grip::after {');
  assert.ok(eigen > gemeinsam, 'die Sonderregel muss nach dem gemeinsamen Block stehen');
});

// --- 3. Betrieb -------------------------------------------------------------
console.log('\n3 — Datenbank-Container:');

const compose = lies('docker-compose.example.yml');

pruefe('der Healthcheck meldet sich mit Zugangsdaten an', () => {
  const block = compose.split('healthcheck:')[1].split('restart:')[0];
  assert.ok(/MYSQL_ROOT_PASSWORD/.test(block),
    'ohne Zugangsdaten meldet mysqladmin „Access denied" und endet trotzdem mit 0');
  assert.ok(/--silent/.test(block));
});

pruefe('das Passwort wird nicht schon von Compose ersetzt', () => {
  const block = compose.split('healthcheck:')[1].split('restart:')[0];
  assert.ok(/\$\$MYSQL_ROOT_PASSWORD/.test(block),
    'einfaches $ ersetzt Compose beim Lesen der Datei');
});

pruefe('die MySQL-Version ist festgelegt', () => {
  assert.ok(/image: mysql:8\.4/.test(compose),
    'der bewegliche Tag mysql:8 holt beim naechsten Pull den naechsten Hauptstand');
  assert.ok(!/image: mysql:8\s*$/m.test(compose));
});

// --- 4. Teilfehler beim Favoriten -------------------------------------------
console.log('\n4 — Favorit mit Rueckfahrt:');

const favCtrl = lies('backend/controllers/favoritController.js');

pruefe('ein Fehler bei der Rueckfahrt wird gemerkt', () => {
  assert.ok(/rueckfahrtFehlt = true/.test(favCtrl));
});

pruefe('die Antwort behauptet dann nicht mehr, beide seien angelegt', () => {
  assert.ok(/Hinfahrt erstellt — die Rueckfahrt konnte nicht angelegt werden/.test(favCtrl));
  // Der Erfolgstext bleibt fuer den Fall, dass wirklich beide stehen.
  assert.ok(/Hin- und Rueckfahrt aus Favorit erstellt/.test(favCtrl));
});

pruefe('die Antwortform bleibt { id, message }', () => {
  // Die Apps auf den Geraeten lesen genau diese beiden Felder.
  assert.ok(/res\.status\(201\)\.json\(\{ id: fahrtId, message \}\)/.test(favCtrl));
});

console.log('\n' + geprueft + ' Pruefungen bestanden.');
