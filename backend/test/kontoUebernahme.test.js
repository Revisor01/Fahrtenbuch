// Kontouebernahme ueber Exponentenschreibweise in der ID (23.09.2026).
//
// Befund: requireAdminOrSelf pruefte mit parseInt(req.params.id), die
// SQL-Abfragen bekamen aber den ROHEN String. parseInt('2e1') ist 2 — MySQL
// liest '2e1' im Vergleich mit einer INT-Spalte als Double und trifft 20.
//
// Auf Produktion gemessen (MySQL 8.4.11):
//   SELECT 20 = '2e1'  ->  1
//   SELECT 10 = '1e1'  ->  1
//   SELECT CAST('2e1' AS UNSIGNED) -> 2
//
// Damit konnte Nutzer 2 per PUT /api/users/2e1 die E-Mail von Nutzer 20
// ueberschreiben und sich danach per "Passwort vergessen" dessen Konto
// aneignen — samt Fahrten, Adressen und IBAN.

const assert = require('assert');
const fs = require('fs');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}
const lies = (pfad) => fs.readFileSync(__dirname + '/../' + pfad, 'utf8');

// --- 1. Das zugrunde liegende JavaScript-Verhalten ------------------------
console.log('\n1 — Warum die Luecke bestand:');

pruefe('parseInt schluckt den Exponenten und liefert eine kleine Zahl', () => {
  assert.strictEqual(parseInt('2e1'), 2);
  assert.strictEqual(parseInt('1e2'), 1);
  assert.strictEqual(parseInt('3e1'), 3);
});

pruefe('als Zahl gelesen ist derselbe String etwas ganz anderes', () => {
  // Das ist der Wert, den MySQL beim Vergleich mit einer INT-Spalte nimmt.
  assert.strictEqual(Number('2e1'), 20);
  assert.strictEqual(Number('1e2'), 100);
});

// --- 2. Die Middleware weist solche IDs jetzt ab --------------------------
console.log('\n2 — requireAdminOrSelf laesst nur reine Ziffern durch:');

const { requireAdminOrSelf } = require('../middleware/authMiddleware');

function laufMit(id, user) {
  const req = { params: { id }, user };
  let status = null;
  let weiter = false;
  const res = {
    status(code) {
      status = code;
      return this;
    },
    json() {
      return this;
    },
  };
  requireAdminOrSelf()(req, res, () => {
    weiter = true;
  });
  return { status, weiter, req };
}

const nutzer2 = { id: 2, role: 'user' };
const admin = { id: 1, role: 'admin' };

pruefe('VERBOTEN: 2e1 wird abgewiesen, nicht als eigene ID gelesen', () => {
  const { status, weiter } = laufMit('2e1', nutzer2);
  assert.strictEqual(weiter, false, 'darf nicht durchgelassen werden');
  assert.strictEqual(status, 400);
});

pruefe('VERBOTEN: auch fuer Admins keine krummen IDs', () => {
  // Sonst schreibt eine Admin-Aktion versehentlich in ein anderes Konto.
  const { status, weiter } = laufMit('2e1', admin);
  assert.strictEqual(weiter, false);
  assert.strictEqual(status, 400);
});

pruefe('VERBOTEN: fremde, aber gueltige ID bleibt 403', () => {
  const { status, weiter } = laufMit('20', nutzer2);
  assert.strictEqual(weiter, false);
  assert.strictEqual(status, 403);
});

pruefe('VERBOTEN: Vorzeichen, Leerzeichen, Komma', () => {
  for (const id of ['+2', ' 2', '2 ', '2.0', '0x2', '2,0', '']) {
    const { status, weiter } = laufMit(id, nutzer2);
    assert.strictEqual(weiter, false, `"${id}" muss abgewiesen werden`);
    assert.strictEqual(status, 400, `"${id}" muss 400 liefern`);
  }
});

pruefe('ERLAUBT: die eigene ID als reine Ziffernfolge', () => {
  const { weiter } = laufMit('2', nutzer2);
  assert.strictEqual(weiter, true);
});

pruefe('ERLAUBT: Admin darf auf fremde Konten', () => {
  const { weiter } = laufMit('20', admin);
  assert.strictEqual(weiter, true);
});

pruefe('die ID steht danach normalisiert in req.params', () => {
  // Damit nachgelagerte SQL-Abfragen nie den Rohwert sehen.
  const { req } = laufMit('2', nutzer2);
  assert.strictEqual(req.params.id, '2');
});

// --- 3. Die Controller pruefen nicht mehr selbst mit parseInt -------------
console.log('\n3 — Controller verlassen sich auf die Middleware:');

pruefe('updateUser vergleicht nicht mehr per parseInt', () => {
  const quelle = lies('controllers/userController.js');
  const block = quelle.split('exports.updateUser')[1].split('exports.')[1] || '';
  assert.ok(
    !/req\.user\.id\s*!==\s*parseInt/.test(quelle.split('exports.updateUser')[1].slice(0, 2000)),
    'parseInt-Vergleich in updateUser muss weg'
  );
});

pruefe('changePassword vergleicht nicht mehr per parseInt', () => {
  const quelle = lies('controllers/userController.js');
  const abschnitt = quelle.split('exports.changePassword')[1] || '';
  assert.ok(
    !/req\.user\.id\s*!==\s*parseInt/.test(abschnitt.slice(0, 2000)),
    'parseInt-Vergleich in changePassword muss weg'
  );
});

pruefe('die Routen haengen an requireAdminOrSelf', () => {
  const quelle = lies('routes/users.js');
  assert.ok(/requireAdminOrSelf/.test(quelle), 'Routen muessen die Middleware nutzen');
});

// --- 4. Passwort-Reset macht alte Sitzungen ungueltig ---------------------
console.log('\n4 — Nach dem Zuruecksetzen gelten alte Token nicht mehr:');

// Die Middleware wirft ein Token raus, dessen iat vor passwort_geaendert_am
// liegt (authMiddleware.js:57-62). Das greift aber nur, wenn der Zeitstempel
// beim Passwortwechsel auch gesetzt wird. setPassword im Controller schrieb
// eigenes SQL am Model vorbei und liess ihn aus — ein gestohlenes Token blieb
// nach "Passwort vergessen" bis zu 14 Tage gueltig und verlaengerte sich bei
// Nutzung weiter.

pruefe('setPassword-Controller setzt passwort_geaendert_am', () => {
  const quelle = lies('controllers/userController.js');
  const abschnitt = quelle.split('exports.setPassword')[1].split('exports.')[1] || '';
  const block = quelle.split('exports.setPassword')[1].slice(0, 2500);
  assert.ok(
    /passwort_geaendert_am\s*=\s*NOW\(\)/.test(block),
    'das UPDATE muss passwort_geaendert_am mitsetzen'
  );
});

pruefe('User.setPassword im Model setzt ihn ebenfalls', () => {
  const quelle = lies('models/User.js');
  const block = quelle.split('static async setPassword')[1].slice(0, 800);
  assert.ok(/passwort_geaendert_am\s*=\s*NOW\(\)/.test(block));
});

pruefe('User.resetPassword im Model setzt ihn ebenfalls', () => {
  const quelle = lies('models/User.js');
  const block = quelle.split('static async resetPassword')[1].slice(0, 800);
  assert.ok(/passwort_geaendert_am\s*=\s*NOW\(\)/.test(block));
});

pruefe('die Middleware wertet den Zeitstempel aus', () => {
  const quelle = lies('middleware/authMiddleware.js');
  assert.ok(/user\.passwort_geaendert_am/.test(quelle));
  assert.ok(/decoded\.iat\s*<\s*geaendert/.test(quelle), 'iat muss verglichen werden');
});

console.log('\n' + geprueft + ' Pruefungen bestanden.\n');
