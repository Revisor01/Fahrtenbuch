// Konto selbst loeschen (24.09.2026).
//
// Store-Blocker aus der Pre-Launch-Pruefung: Registrieren ging in der App,
// Loeschen nur ueber eine Administratorin. Apple (5.1.1 v) und Google
// verlangen beides in der App — eine Einreichung waere daran gescheitert.
//
// Geprueft wird, was ohne Datenbank pruefbar ist: Schema, Route, Absicherung
// und die Vollstaendigkeit der Loeschkaskade. Der tatsaechliche Loeschvorgang
// laeuft gegen die Instanz, nicht hier.

const assert = require('assert');
const fs = require('fs');
const { deleteAccountSchema } = require('../schemas/profileSchemas');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}
const lies = (pfad) => fs.readFileSync(__dirname + '/../' + pfad, 'utf8');

// --- 1. Ohne Passwort geht nichts ----------------------------------------
console.log('\n1 — Das Loeschen verlangt eine Bestaetigung:');

pruefe('VERBOTEN: ohne Passwort', () => {
  assert.strictEqual(deleteAccountSchema.safeParse({}).success, false);
});

pruefe('VERBOTEN: leeres Passwort', () => {
  assert.strictEqual(deleteAccountSchema.safeParse({ password: '' }).success, false);
});

pruefe('ERLAUBT: mit Passwort', () => {
  assert.strictEqual(deleteAccountSchema.safeParse({ password: 'geheim123' }).success, true);
});

pruefe('der Controller vergleicht das Passwort wirklich', () => {
  const quelle = lies('controllers/profileController.js');
  const block = quelle.split('exports.deleteAccount')[1] || '';
  assert.ok(/bcrypt\.compare/.test(block), 'ohne bcrypt.compare ist die Abfrage wertlos');
  assert.ok(/Passwort ist falsch/.test(block), 'falsches Passwort muss abgewiesen werden');
});

// --- 2. Die Route ist richtig abgesichert --------------------------------
console.log('\n2 — Die Route haengt hinter Anmeldung, Limit und Schema:');

pruefe('DELETE / ist angelegt', () => {
  const quelle = lies('routes/profile.js');
  assert.ok(/router\.delete\('\/'/.test(quelle));
});

pruefe('nur fuer Angemeldete', () => {
  const quelle = lies('routes/profile.js');
  const vorRoute = quelle.split("router.delete('/'")[0];
  assert.ok(/router\.use\(authMiddleware\)/.test(vorRoute), 'authMiddleware muss davor stehen');
});

pruefe('mit Rate-Limit gegen Passwort-Durchprobieren', () => {
  const quelle = lies('routes/profile.js');
  const zeile = quelle.split("router.delete('/'")[1].split('\n')[0];
  assert.ok(/passwortLimiter/.test(zeile));
});

pruefe('mit Schema-Pruefung', () => {
  const quelle = lies('routes/profile.js');
  const zeile = quelle.split("router.delete('/'")[1].split('\n')[0];
  assert.ok(/validate\(deleteAccountSchema\)/.test(zeile));
});

pruefe('loescht das EIGENE Konto, nie ein fremdes', () => {
  const quelle = lies('controllers/profileController.js');
  const block = quelle.split('exports.deleteAccount')[1] || '';
  assert.ok(/User\.delete\(req\.user\.id\)/.test(block), 'nur req.user.id darf geloescht werden');
  assert.ok(!/req\.params/.test(block), 'keine ID aus der URL verwenden');
  assert.ok(!/req\.body\.(id|userId)/.test(block), 'keine ID aus dem Rumpf verwenden');
});

// --- 3. Der letzte Administrator bleibt geschuetzt -----------------------
console.log('\n3 — Das Fahrtenbuch bleibt verwaltbar:');

pruefe('User.delete schuetzt den letzten Admin', () => {
  const quelle = lies('models/User.js');
  const block = quelle.split('static async delete')[1].slice(0, 2000);
  assert.ok(/letzte Admin/i.test(block));
});

pruefe('der Controller meldet das verstaendlich statt mit 500', () => {
  const quelle = lies('controllers/profileController.js');
  const block = quelle.split('exports.deleteAccount')[1] || '';
  assert.ok(/letzte Admin/i.test(block), 'der Fall muss abgefangen werden');
  assert.ok(/409/.test(block), 'Konflikt, nicht Serverfehler');
});

// --- 4. Es bleibt nichts liegen ------------------------------------------
console.log('\n4 — Die Loeschung ist vollstaendig:');

pruefe('alle Tabellen mit user_id werden geraeumt', () => {
  const quelle = lies('models/User.js');
  const block = quelle.split('static async delete')[1].slice(0, 3000);
  for (const tabelle of [
    'abrechnungen',
    'erstattungsbetraege',
    'abrechnungstraeger',
    'fahrten',
    'distanzen',
    'orte',
    'mitfahrer_erstattung',
    'email_verifications',
  ]) {
    assert.ok(new RegExp(`DELETE FROM ${tabelle}`).test(block), `${tabelle} fehlt`);
  }
  assert.ok(/DELETE FROM users WHERE id/.test(block), 'zuletzt das Konto selbst');
});

pruefe('alles in einer Transaktion, mit Ruecknahme bei Fehler', () => {
  const quelle = lies('models/User.js');
  const block = quelle.split('static async delete')[1].slice(0, 3000);
  assert.ok(/beginTransaction/.test(block));
  assert.ok(/rollback/.test(block));
  assert.ok(/finally/.test(block) && /release/.test(block), 'Verbindung muss zurueck in den Pool');
});

console.log('\n' + geprueft + ' Pruefungen bestanden.\n');
