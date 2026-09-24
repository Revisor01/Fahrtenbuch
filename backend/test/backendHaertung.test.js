// Punkt 11 der Pre-Launch-Liste (Backend, MITTEL) und zwei Teilbefunde aus
// Punkt 15. Alle vorher gegen den Code geprueft; die Zeilenangaben der Liste
// waren teils veraltet.
//
// Laeuft ohne Test-Framework: `node test/backendHaertung.test.js`.

const assert = require('assert');
const fs = require('fs');
const bcrypt = require('bcrypt');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}
const lies = (p) => fs.readFileSync(__dirname + '/../' + p, 'utf8');

// --- 1. E-Mail-Kollision --------------------------------------------------
console.log('\n1 — Fremde E-Mail-Adresse:');

const userCtrl = lies('controllers/userController.js');

pruefe('updateUser prueft, ob die Adresse einem anderen Konto gehoert', () => {
  const abschnitt = userCtrl.split('exports.updateUser')[1].split('exports.')[0];
  assert.ok(/SELECT user_id FROM user_profiles WHERE email = \? AND user_id != \?/.test(abschnitt),
    'sonst laesst sich ein Konto auf eine fremde Adresse umziehen — die '
    + 'andere Person verliert ihren Zugang ueber „Passwort vergessen"');
});

pruefe('bei Kollision wird zurueckgerollt, nicht nur abgebrochen', () => {
  const abschnitt = userCtrl.split('exports.updateUser')[1].split('exports.')[0];
  const stelle = abschnitt.indexOf('wird bereits verwendet');
  const davor = abschnitt.slice(Math.max(0, stelle - 200), stelle);
  assert.ok(/connection\.rollback\(\)/.test(davor),
    'ohne rollback geht die Verbindung mit offener Transaktion in den Pool');
});

pruefe('alle drei Schreibwege pruefen jetzt', () => {
  // updateUser, resendVerification (userController) und profileController.
  const profil = lies('controllers/profileController.js');
  const treffer = (userCtrl.match(/AND user_id != \?/g) || []).length;
  assert.strictEqual(treffer, 2, 'updateUser und resendVerification');
  assert.ok(/AND user_id != \?/.test(profil));
});

// --- 2. Mailversand ---------------------------------------------------------
console.log('\n2 — Mailversand an frei waehlbare Adressen:');

const limiter = lies('middleware/rateLimiter.js');
const userRoutes = lies('routes/users.js');

pruefe('es gibt einen eigenen Limiter fuer Mailversand', () => {
  assert.ok(/const mailLimiter = rateLimit\(/.test(limiter));
  assert.ok(/mailLimiter,/.test(limiter), 'und er wird exportiert');
});

pruefe('er zaehlt pro Konto, nicht pro Anschluss', () => {
  const block = limiter.split('const mailLimiter')[1].split('});')[0];
  assert.ok(/req\.user\?\.id \? 'nutzer:' \+ req\.user\.id/.test(block),
    'sonst sperren sich Nutzer:innen hinter demselben Anschluss gegenseitig');
});

pruefe('er ist deutlich enger als das Schreiblimit', () => {
  const block = limiter.split('const mailLimiter')[1].split('});')[0];
  const max = parseInt(block.match(/max: (\d+)/)[1], 10);
  const fenster = parseInt(block.match(/windowMs: (\d+) \* 60 \* 1000/)[1], 10);
  assert.ok(max <= 10, `max ${max} ist zu hoch fuer Mailversand`);
  assert.ok(fenster >= 30, `Fenster ${fenster} min ist zu kurz`);
});

pruefe('resend-verification haengt am Mail-Limiter', () => {
  const zeile = userRoutes.split('\n').find((z) => z.includes("'/resend-verification'"));
  assert.ok(zeile.includes('mailLimiter'));
  assert.ok(zeile.indexOf('authMiddleware') < zeile.indexOf('mailLimiter'),
    'erst anmelden, dann zaehlen — sonst zaehlt der Limiter auf die IP');
});

// --- 3. error.message -------------------------------------------------------
console.log('\n3 — Keine Innereien in der Antwort:');

pruefe('kein Controller und kein Helfer sendet error.message', () => {
  for (const ordner of ['controllers', 'utils', 'routes']) {
    for (const datei of fs.readdirSync(__dirname + '/../' + ordner)) {
      if (!datei.endsWith('.js')) continue;
      const inhalt = lies(`${ordner}/${datei}`);
      assert.ok(!/error: error\.message/.test(inhalt),
        `${ordner}/${datei} sendet error.message — darin stehen MySQL-Texte, `
        + 'LibreOffice-stderr und Temp-Pfade');
    }
  }
});

pruefe('die Meldung selbst bleibt erhalten', () => {
  // Der Nutzer soll weiterhin erfahren, was schiefging.
  assert.ok(/message: 'Fehler beim PDF-Export'/.test(lies('utils/pdfExport.js')));
  assert.ok(/message: 'Fehler beim Exportieren nach Excel'/.test(lies('utils/excelExport.js')));
});

// --- 4. Nutzer-Enumeration --------------------------------------------------
console.log('\n4 — Gleiche Antwortzeit fuer bekannte und unbekannte Konten:');

const authCtrl = lies('controllers/authController.js');

pruefe('es gibt einen Vergleichshash', () => {
  assert.ok(/const DUMMY_HASH = bcrypt\.hashSync\(/.test(authCtrl));
});

pruefe('er nutzt dieselbe Kostenstufe wie echte Passwoerter', () => {
  const dummy = authCtrl.match(/bcrypt\.hashSync\([^,]+, (\d+)\)/);
  const echt = lies('controllers/userController.js').match(/bcrypt\.genSalt\((\d+)\)/);
  assert.strictEqual(dummy[1], echt[1],
    'bei abweichender Stufe bliebe ein messbarer Zeitunterschied');
});

pruefe('der unbekannte Name vergleicht trotzdem', () => {
  const abschnitt = authCtrl.split('exports.login')[1].split('exports.')[0];
  const stelle = abschnitt.indexOf('rows.length === 0');
  const block = abschnitt.slice(stelle, stelle + 300);
  assert.ok(/bcrypt\.compare\(password, DUMMY_HASH\)/.test(block));
  assert.ok(block.indexOf('DUMMY_HASH') < block.indexOf('res.status(401)'),
    'der Vergleich muss VOR der Antwort laufen');
});

pruefe('der Vergleich kostet wirklich Zeit (gemessen)', () => {
  // Sonst waere der Dummy-Hash reine Kosmetik.
  const dummy = bcrypt.hashSync('kein-konto-mit-diesem-namen', 10);
  const start = process.hrtime.bigint();
  bcrypt.compareSync('falsch', dummy);
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  assert.ok(ms > 10, `Vergleich dauerte nur ${ms.toFixed(1)} ms`);
});

pruefe('die Meldung ist fuer beide Faelle dieselbe', () => {
  const abschnitt = authCtrl.split('exports.login')[1].split('exports.')[0];
  const meldungen = abschnitt.match(/message: '[^']*'/g).filter((m) => m.includes('ltig'));
  assert.ok(meldungen.length >= 2);
  assert.strictEqual(new Set(meldungen).size, 1,
    'unterschiedliche Texte verraten, welche Konten es gibt');
});

// --- 5. JWT ------------------------------------------------------------------
console.log('\n5 — Token:');

const mw = lies('middleware/authMiddleware.js');
const app = lies('app.js');

pruefe('jwt.verify nagelt das Verfahren fest', () => {
  assert.ok(/algorithms: \['HS256'\]/.test(mw));
});

pruefe('ein kurzes JWT_SECRET wird gemeldet', () => {
  assert.ok(/JWT_MINDESTLAENGE/.test(app));
  assert.ok(/console\.warn/.test(app.split('JWT_MINDESTLAENGE')[2] || ''),
    'als Warnung');
});

pruefe('der Start bricht deswegen NICHT ab', () => {
  // Ein process.exit() liesse den Server beim naechsten Deploy nicht mehr
  // hochkommen, falls das Produktions-Secret kurz ist — ein Ausfall als
  // Antwort auf ein Risiko, das seit Monaten besteht.
  const block = app.split('JWT_MINDESTLAENGE')[1].split('\n}')[0];
  assert.ok(!/process\.exit/.test(block));
});

// --- 6. Kleinigkeiten ---------------------------------------------------------
console.log('\n6 — Grenzen:');

pruefe('der Rumpf darf hoechstens 1 MB gross sein', () => {
  assert.ok(/express\.json\(\{ limit: '1mb' \}\)/.test(app),
    'es gibt keinen Upload-Pfad, 10 MB war unnoetig viel');
});

pruefe('Passwoerter brauchen bei Neuvergabe 10 Zeichen', () => {
  for (const datei of ['schemas/userSchemas.js', 'schemas/profileSchemas.js']) {
    const inhalt = lies(datei);
    assert.ok(!/min\(6,/.test(inhalt), `${datei} erlaubt noch 6 Zeichen`);
    assert.ok(/min\(10,/.test(inhalt));
  }
});

pruefe('das Anmelden prueft die Laenge NICHT', () => {
  // Sonst waeren alle Bestandsnutzer mit kuerzerem Passwort ausgesperrt.
  const auth = lies('schemas/authSchemas.js');
  assert.ok(/password: z\.string\(\)\.min\(1,/.test(auth),
    'die Laenge gilt nur bei der Neuvergabe');
});

pruefe('anlass ist auf die Spaltenbreite begrenzt', () => {
  const schema = lies('schemas/fahrtSchemas.js');
  const treffer = (schema.match(/\.max\(255, 'Anlass/g) || []).length;
  assert.strictEqual(treffer, 2, 'create und update');
  // Gegenprobe gegen die Migration.
  const ddl = lies('migrations/0001_initial_schema.sql');
  assert.ok(/anlass VARCHAR\(255\) NOT NULL/.test(ddl),
    'die Grenze muss zur Spalte passen');
});

pruefe('ein zu langer Anlass wird mit Meldung abgewiesen, nicht mit 500', () => {
  const { createFahrtSchema } = require('../schemas/fahrtSchemas');
  const basis = { datum: '2026-09-24', anlass: 'x', kilometer: 10, abrechnung: 1 };
  assert.ok(createFahrtSchema.safeParse({ ...basis, anlass: 'a'.repeat(255) }).success);
  const zuLang = createFahrtSchema.safeParse({ ...basis, anlass: 'a'.repeat(256) });
  assert.ok(!zuLang.success);
  assert.match(zuLang.error.issues[0].message, /255/);
});

// --- 7. Doppelter Erstattungssatz meldet sich richtig -------------------------
console.log('\n7 — Doppelter Stichtag ergibt 409:');

for (const [name, datei] of [
  ['Mitfahrer-Satz', 'controllers/mitfahrerErstattungController.js'],
  ['Traeger-Satz', 'controllers/abrechnungstraegerController.js'],
]) {
  pruefe(`${name}: ER_DUP_ENTRY wird zu 409 statt 500`, () => {
    const inhalt = lies(datei);
    assert.ok(/error\.code === 'ER_DUP_ENTRY'/.test(inhalt));
    assert.ok(/status\(409\)/.test(inhalt));
  });
}

pruefe('das Frontend prueft auf 409, nicht auf einen Meldungstext', () => {
  // Frueher suchte es „Duplicate entry" in einem `error`-Feld, das gar nicht
  // gesendet wurde — die Meldung konnte nie erscheinen.
  for (const p of ['MitfahrerBereich', 'ErstattungBereich']) {
    const inhalt = fs.readFileSync(
      `${__dirname}/../../frontend/src/components/einstellungen/${p}.js`, 'utf8');
    assert.ok(/error\.response\?\.status === 409/.test(inhalt), p);
    // Auf den Code pruefen, nicht auf das Wort: Es steht weiterhin im
    // erklaerenden Kommentar darueber.
    assert.ok(!/data\?\.error\?\.includes/.test(inhalt),
      `${p} liest noch das nicht gesendete error-Feld`);
  }
});

console.log('\n' + geprueft + ' Pruefungen bestanden.');
