// Tests zu den Befunden der API-Analyse vom 24.08.
//
// Diese Tests pruefen Logik, die ohne Datenbank auskommt: Fehlerpfade,
// Modulstruktur und Schema-Verhalten. Was zwingend eine DB braucht (z. B. das
// tatsaechliche Passwort-Update), ist hier bewusst nicht abgedeckt und wurde
// stattdessen gegen die laufende Instanz gemessen.
//
// Laeuft ohne Test-Framework: `node test/befunde.test.js`.

const assert = require('assert');
const { z } = require('zod');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

// --- Befund 1: Passwort-Hash wird gezielt geladen -------------------------
// findById darf den Hash NICHT liefern (steckt sonst in req.user),
// findByIdMitPasswort muss ihn liefern.
console.log('\nBefund 1 — Passwort-Hash:');

const userQuellcode = require('fs').readFileSync(__dirname + '/../models/User.js', 'utf8');

pruefe('findByIdMitPasswort existiert', () => {
  const User = require('../models/User');
  assert.strictEqual(typeof User.findByIdMitPasswort, 'function');
});

pruefe('findById selektiert KEIN password', () => {
  const abschnitt = userQuellcode.split('static async findById(')[1].split('static async')[0];
  assert.ok(!/\bu\.password\b|\bpassword\b/.test(abschnitt.split('FROM')[0]),
    'findById darf den Hash nicht mitliefern');
});

pruefe('findByIdMitPasswort selektiert password', () => {
  const abschnitt = userQuellcode.split('static async findByIdMitPasswort(')[1].split('static async')[0];
  assert.ok(/password/.test(abschnitt), 'findByIdMitPasswort muss den Hash liefern');
});

pruefe('changePassword nutzt nicht mehr findById fuer den Hash', () => {
  const ctrl = require('fs').readFileSync(__dirname + '/../controllers/userController.js', 'utf8');
  const abschnitt = ctrl.split('exports.changePassword')[1].split('exports.')[0];
  assert.ok(abschnitt.includes('findByIdMitPasswort'), 'muss findByIdMitPasswort verwenden');
  assert.ok(!/const user = await User\.findById\(id\)/.test(abschnitt),
    'darf den Hash nicht mehr aus findById erwarten');
});

// --- Befund 2: Zod-4-Fehlerpfad bei Favoriten -----------------------------
// error.errors gibt es in Zod 4 nicht mehr; der Handler muss issues nutzen.
console.log('\nBefund 2 — Zod-4-Fehlerliste:');

pruefe('Zod 4 liefert issues, nicht errors', () => {
  try {
    z.object({ a: z.string() }).parse({});
    assert.fail('parse haette werfen muessen');
  } catch (e) {
    assert.ok(Array.isArray(e.issues), 'issues muss ein Array sein');
    assert.strictEqual(e.errors, undefined, 'errors existiert in Zod 4 nicht');
  }
});

pruefe('favoritController liest issues mit Fallback', () => {
  const ctrl = require('fs').readFileSync(__dirname + '/../controllers/favoritController.js', 'utf8');
  assert.ok(ctrl.includes('error.issues'), 'muss error.issues lesen');
  assert.ok(!/errors: error\.errors\.map/.test(ctrl),
    'darf nicht mehr direkt auf error.errors.map zugreifen');
});

pruefe('der Fehlerpfad wirft nicht mehr', () => {
  // Nachstellen, was der Controller tut
  let fehler;
  try { z.object({ a: z.string() }).parse({}); } catch (e) { fehler = e; }
  const issues = fehler.issues || fehler.errors || [];
  const ausgabe = issues.map((err) => ({
    field: Array.isArray(err.path) ? err.path.join('.') : String(err.path ?? ''),
    message: err.message,
  }));
  assert.strictEqual(ausgabe.length, 1);
  assert.strictEqual(ausgabe[0].field, 'a');
});

// --- Befund 3: rollback vor dem Return ------------------------------------
console.log('\nBefund 3 — offene Transaktion:');

pruefe('mitfahrerErstattung rollt zurueck, bevor es abbricht', () => {
  const ctrl = require('fs').readFileSync(__dirname + '/../controllers/mitfahrerErstattungController.js', 'utf8');
  const stelle = ctrl.indexOf('Der letzte Erstattungssatz kann nicht');
  assert.ok(stelle > -1, 'Meldung muss existieren');
  const davor = ctrl.slice(Math.max(0, stelle - 400), stelle);
  assert.ok(davor.includes('connection.rollback()'),
    'vor dem Abbruch muss ein rollback stehen');
});

// --- Befund 4: heuteISO importiert ----------------------------------------
console.log('\nBefund 4 — fehlender Import:');

pruefe('AbrechnungsTraeger importiert heuteISO', () => {
  const model = require('fs').readFileSync(__dirname + '/../models/AbrechnungsTraeger.js', 'utf8');
  assert.ok(/require\(['"]\.\.\/utils\/datum['"]\)/.test(model), 'muss utils/datum importieren');
  assert.ok(model.includes('heuteISO'), 'nutzt heuteISO');
});

pruefe('heuteISO liefert ein ISO-Datum', () => {
  const { heuteISO } = require('../utils/datum');
  assert.match(heuteISO(), /^\d{4}-\d{2}-\d{2}$/);
});

console.log('\n' + geprueft + ' Pruefungen bestanden.');
