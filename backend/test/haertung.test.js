// Tests zur Haertung vom 24.08. — die Punkte aus der Endpunkt-Analyse, die
// nicht Nutzer:innen direkt betrafen, aber Luecken waren.
//
// Geprueft wird, was ohne Datenbank pruefbar ist: Schema-Verhalten,
// Modulstruktur und die Token-Logik der Middleware. Der tatsaechliche
// Datenbank-Weg wird gegen die laufende Instanz gemessen, nicht hier.

const assert = require('assert');
const fs = require('fs');
const jwt = require('jsonwebtoken');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}
const lies = (pfad) => fs.readFileSync(__dirname + '/../' + pfad, 'utf8');

// --- 1. Rate-Limit auf Passwortwechsel ------------------------------------
console.log('\n1 — Passwortwechsel wird gebremst:');

pruefe('passwortLimiter existiert', () => {
  const { passwortLimiter } = require('../middleware/rateLimiter');
  assert.strictEqual(typeof passwortLimiter, 'function');
});

pruefe('zaehlt pro Konto, nicht pro IP', () => {
  const quelle = lies('middleware/rateLimiter.js');
  const block = quelle.split('const passwortLimiter')[1].split('module.exports')[0];
  assert.ok(/keyGenerator/.test(block), 'braucht einen eigenen Schluessel');
  assert.ok(/req\.user\?\.id/.test(block), 'muss die Konto-ID nutzen');
});

pruefe('erfolgreiche Wechsel zaehlen nicht mit', () => {
  const quelle = lies('middleware/rateLimiter.js');
  const block = quelle.split('const passwortLimiter')[1].split('module.exports')[0];
  assert.ok(/skipSuccessfulRequests:\s*true/.test(block));
});

pruefe('greift auf /api/profile/change-password', () => {
  const route = lies('routes/profile.js');
  assert.ok(/change-password',\s*passwortLimiter/.test(route));
});

pruefe('greift auf /api/users/:id/password', () => {
  const route = lies('routes/users.js');
  assert.ok(/\/:id\/password',[^;]*passwortLimiter/.test(route));
});

pruefe('laeuft dort NACH authMiddleware (sonst zaehlt er pro IP)', () => {
  const route = lies('routes/users.js');
  const zeile = route.split('\n').find((z) => z.includes("'/:id/password'"));
  assert.ok(zeile.indexOf('authMiddleware') < zeile.indexOf('passwortLimiter'),
    'authMiddleware muss zuerst laufen');
});

// --- 2. E-Mail-Kollision --------------------------------------------------
console.log('\n2 — fremde E-Mail-Adresse wird abgewiesen:');

for (const [name, datei] of [['resend-verification', 'controllers/userController.js'],
                             ['Profil-Aenderung', 'controllers/profileController.js']]) {
  pruefe(name + ' prueft auf bereits vergebene Adresse', () => {
    const quelle = lies(datei);
    assert.ok(/SELECT user_id FROM user_profiles WHERE email = \? AND user_id != \?/.test(quelle),
      'Kollisionspruefung fehlt');
    assert.ok(/wird bereits verwendet/.test(quelle), 'Meldung fehlt');
  });
}

pruefe('Profil-Aenderung rollt vorher die Transaktion zurueck', () => {
  const quelle = lies('controllers/profileController.js');
  const stelle = quelle.indexOf('wird bereits verwendet');
  const davor = quelle.slice(Math.max(0, stelle - 300), stelle);
  assert.ok(davor.includes('connection.rollback()'));
});

// --- 3. Registrierung: eine Regel statt zwei ------------------------------
console.log('\n3 — Registrierung wird einheitlich beurteilt:');

const { registrierungErlaubt } = require('../utils/registrierung');
const faelle = [[undefined, true], ['', true], ['true', true], ['TRUE', true], [' true ', true],
                ['false', false], ['0', false], ['nein', false], ['ja', false]];
for (const [wert, erwartet] of faelle) {
  pruefe(`ALLOW_REGISTRATION=${JSON.stringify(wert)} -> ${erwartet ? 'erlaubt' : 'gesperrt'}`, () => {
    if (wert === undefined) delete process.env.ALLOW_REGISTRATION;
    else process.env.ALLOW_REGISTRATION = wert;
    assert.strictEqual(registrierungErlaubt(), erwartet);
  });
}
delete process.env.ALLOW_REGISTRATION;

pruefe('beide Controller nutzen dieselbe Funktion', () => {
  for (const datei of ['controllers/konfigController.js', 'controllers/authController.js']) {
    const quelle = lies(datei);
    assert.ok(/registrierungErlaubt\(\)/.test(quelle), datei + ': nutzt die Funktion nicht');
    assert.ok(!/process\.env\.ALLOW_REGISTRATION/.test(quelle), datei + ': prueft noch selbst');
  }
});

// --- 4. Farbe des Abrechnungstraegers -------------------------------------
console.log('\n4 — Farbe laesst sich setzen:');

const { createAbrechnungstraegerSchema, updateAbrechnungstraegerSchema } =
  require('../schemas/abrechnungstraegerSchemas');

for (const [name, schema] of [['Anlegen', createAbrechnungstraegerSchema],
                              ['Aendern', updateAbrechnungstraegerSchema]]) {
  pruefe(name + ': gueltige Farbe kommt durch', () => {
    const r = schema.safeParse({ name: 'Kirchenkreis', farbe: '#0F5257' });
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.data.farbe, '#0F5257');
  });
  pruefe(name + ': unsinnige Farbe wird abgewiesen', () => {
    assert.strictEqual(schema.safeParse({ name: 'X', farbe: 'rot' }).success, false);
    assert.strictEqual(schema.safeParse({ name: 'X', farbe: '#abc' }).success, false);
  });
  pruefe(name + ': ohne Farbe bleibt es zulaessig', () => {
    assert.strictEqual(schema.safeParse({ name: 'X' }).success, true);
  });
}

// --- 5. Orte: beide Schreibweisen -----------------------------------------
console.log('\n5 — Orte nehmen beide Schreibweisen:');

const { createOrtSchema, updateOrtSchema } = require('../schemas/ortSchemas');

pruefe('Anlegen versteht camelCase', () => {
  const r = createOrtSchema.parse({ name: 'A', adresse: 'B', istWohnort: true });
  assert.strictEqual(r.istWohnort, true);
});
pruefe('Anlegen versteht snake_case', () => {
  const r = createOrtSchema.parse({ name: 'A', adresse: 'B', ist_wohnort: true });
  assert.strictEqual(r.istWohnort, true, 'snake_case muss ankommen');
});
pruefe('Aendern versteht snake_case', () => {
  const r = updateOrtSchema.parse({ name: 'A', adresse: 'B', ist_dienstort: true });
  assert.strictEqual(r.ist_dienstort, true);
});
pruefe('Aendern versteht camelCase', () => {
  const r = updateOrtSchema.parse({ name: 'A', adresse: 'B', istDienstort: true });
  assert.strictEqual(r.ist_dienstort, true, 'camelCase muss ankommen');
});
pruefe('Controller bekommt weiterhin seine gewohnte Form', () => {
  const c = createOrtSchema.parse({ name: 'A', adresse: 'B' });
  assert.deepStrictEqual(Object.keys(c).sort(),
    ['adresse', 'istDienstort', 'istKirchspiel', 'istWohnort', 'name']);
  const u = updateOrtSchema.parse({ name: 'A', adresse: 'B' });
  assert.deepStrictEqual(Object.keys(u).sort(),
    ['adresse', 'ist_dienstort', 'ist_kirchspiel', 'ist_wohnort', 'name']);
});

// --- 6. Passwortwechsel wirft alte Anmeldungen ab -------------------------
console.log('\n6 — alte Anmeldungen gelten nach Passwortwechsel nicht mehr:');

pruefe('Migration legt die Spalte an', () => {
  const m = lies('migrations/0012_passwort_geaendert_am.sql');
  assert.ok(/passwort_geaendert_am/.test(m));
  assert.ok(/information_schema/.test(m), 'muss idempotent sein');
});

pruefe('jeder Passwort-Schreibweg setzt den Zeitstempel', () => {
  const user = lies('models/User.js');
  const profil = lies('controllers/profileController.js');
  const stellen = [...user.matchAll(/UPDATE users SET password = /g)];
  assert.ok(stellen.length >= 2, 'erwartet mehrere Schreibstellen in User.js');
  for (const m of user.matchAll(/'UPDATE users SET password = [^']*'/g)) {
    assert.ok(m[0].includes('passwort_geaendert_am'), 'ohne Zeitstempel: ' + m[0].slice(0, 70));
  }
  for (const m of profil.matchAll(/'UPDATE users SET password = [^']*'/g)) {
    assert.ok(m[0].includes('passwort_geaendert_am'), 'ohne Zeitstempel: ' + m[0].slice(0, 70));
  }
});

pruefe('findById liest die Spalte mit', () => {
  const user = lies('models/User.js');
  const abschnitt = user.split('static async findById(')[1].split('static async')[0];
  assert.ok(/passwort_geaendert_am/.test(abschnitt));
});

// Die Vergleichslogik der Middleware nachstellen
function tokenGiltNoch(iat, geaendertAm) {
  if (!geaendertAm || !iat) return true;
  const geaendert = Math.floor(new Date(geaendertAm).getTime() / 1000);
  if (!Number.isFinite(geaendert)) return true;
  return !(iat < geaendert - 1);
}

pruefe('Token von VOR dem Wechsel gilt nicht mehr', () => {
  const jetzt = Math.floor(Date.now() / 1000);
  assert.strictEqual(tokenGiltNoch(jetzt - 3600, new Date().toISOString()), false);
});
pruefe('Token von NACH dem Wechsel gilt', () => {
  const vorEinerStunde = new Date(Date.now() - 3600 * 1000).toISOString();
  assert.strictEqual(tokenGiltNoch(Math.floor(Date.now() / 1000), vorEinerStunde), true);
});
pruefe('nie geaendert: alle Token gelten weiter', () => {
  assert.strictEqual(tokenGiltNoch(Math.floor(Date.now() / 1000) - 99999, null), true);
});
pruefe('eine Sekunde Toleranz (iat wird abgerundet)', () => {
  const jetzt = Date.now();
  assert.strictEqual(tokenGiltNoch(Math.floor(jetzt / 1000), new Date(jetzt).toISOString()), true);
});

pruefe('Middleware prueft den Zeitstempel', () => {
  const mw = lies('middleware/authMiddleware.js');
  assert.ok(/passwort_geaendert_am/.test(mw));
  assert.ok(/decoded\.iat/.test(mw));
  assert.ok(/Anmeldung abgelaufen/.test(mw));
});

pruefe('Profilwechsel liefert ein frisches Token mit', () => {
  const c = lies('controllers/profileController.js');
  const abschnitt = c.split('exports.changePassword')[1];
  assert.ok(/ERNEUERUNGS_HEADER/.test(abschnitt), 'sonst sperrt man sich selbst aus');
  assert.ok(/mitApiSchluessel/.test(abschnitt), 'nur fuer JWT, nicht fuer API-Schluessel');
});

pruefe('das frische Token wuerde die Pruefung ueberstehen', () => {
  const geheim = 'test-geheimnis';
  const token = jwt.sign({ id: 1, role: 'user' }, geheim, { expiresIn: '1d' });
  const decoded = jwt.verify(token, geheim);
  assert.strictEqual(tokenGiltNoch(decoded.iat, new Date().toISOString()), true);
});

console.log('\n' + geprueft + ' Pruefungen bestanden.');
