// Eine neue E-Mail-Adresse gilt erst nach Bestätigung, sonst übernimmt ein gestohlenes Token per Passwort-Reset das Konto. Aufruf: node test/emailWechsel.test.js

const assert = require('assert');
const path = require('path');

const ALT = 'alt@example.org';
const NEU = 'angreifer@example.org';
let aufrufe = [];

function ergebnis(sql) {
  if (/SELECT \* FROM user_profiles/.test(sql)) return [[{ user_id: 7, email: ALT, full_name: 'Alt' }]];
  if (/SELECT user_id FROM user_profiles WHERE email/.test(sql)) return [[]];
  if (/SELECT \* FROM users/.test(sql)) return [[{ id: 7, username: 'nutzer' }]];
  return [{ affectedRows: 1 }];
}
const ausfuehren = async (sql, params) => {
  aufrufe.push({ sql, params });
  return ergebnis(sql);
};
const verbindung = { beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {}, execute: ausfuehren };
const mails = [];

function ersetze(modul, exportiert) {
  const pfad = require.resolve(path.join(__dirname, '..', modul));
  require.cache[pfad] = { id: pfad, filename: pfad, loaded: true, exports: exportiert };
}
ersetze('config/database', { execute: ausfuehren, getConnection: async () => verbindung });
ersetze('services/mailService', { sendEmailVerification: async (...a) => mails.push(a) });

const profil = require('../controllers/profileController');
const nutzer = require('../controllers/userController');

function antwort() {
  return { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
}
const profilUpdate = () => aufrufe.find((a) => /^UPDATE user_profiles SET email/.test(a.sql.trim()));

let geprueft = 0;
async function pruefe(beschreibung, fn) {
  aufrufe = [];
  mails.length = 0;
  await fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

(async () => {
  await pruefe('VERBOTEN: PUT /api/profile mit neuer Adresse speichert sie nicht sofort', async () => {
    const res = antwort();
    await profil.updateProfile({ user: { id: 7 }, body: { email: NEU, fullName: 'Neu' } }, res);
    assert.strictEqual(res.code, 200);
    assert.strictEqual(profilUpdate().params[0], ALT);
    assert.strictEqual(profilUpdate().params[1], 'Neu');
  });

  await pruefe('ERLAUBT: die neue Adresse wartet in email_verifications und bekommt den Bestätigungslink', async () => {
    await profil.updateProfile({ user: { id: 7 }, body: { email: NEU } }, antwort());
    const vormerkung = aufrufe.find((a) => /INSERT INTO email_verifications/.test(a.sql));
    assert.deepStrictEqual(vormerkung.params.slice(0, 2), [7, NEU]);
    assert.strictEqual(mails.length, 1);
    assert.strictEqual(mails[0][0], NEU);
  });

  await pruefe('die bisherige, bestätigte Adresse bleibt bestätigt', async () => {
    await profil.updateProfile({ user: { id: 7 }, body: { email: NEU } }, antwort());
    assert.ok(!aufrufe.some((a) => /email_verified = FALSE/.test(a.sql)));
  });

  await pruefe('ERLAUBT: gleiche Adresse, andere Felder werden wie bisher gespeichert', async () => {
    await profil.updateProfile({ user: { id: 7 }, body: { email: ALT, fullName: 'Neu' } }, antwort());
    assert.deepStrictEqual(profilUpdate().params.slice(0, 2), [ALT, 'Neu']);
    assert.strictEqual(mails.length, 0);
  });

  await pruefe('VERBOTEN: PUT /api/users/:id mit neuer Adresse speichert sie nicht sofort', async () => {
    const res = antwort();
    await nutzer.updateUser({ params: { id: '7' }, user: { id: 7, role: 'user' }, body: { username: 'nutzer', email: NEU, fullName: 'Neu' } }, res);
    assert.strictEqual(res.code, 200);
    assert.strictEqual(profilUpdate().params[0], ALT);
    assert.ok(aufrufe.some((a) => /INSERT INTO email_verifications/.test(a.sql) && a.params[1] === NEU));
  });

  await pruefe('ERLAUBT: die Bestätigung übernimmt die vorgemerkte Adresse', async () => {
    const User = require('../models/User');
    const quelle = User.verifyEmail.toString();
    assert.ok(/UPDATE user_profiles SET email = \? WHERE user_id = \?/.test(quelle));
    assert.ok(/verification\.new_email/.test(quelle));
  });

  await pruefe('GET /api/profile nennt die ausstehende Adresse als neues Feld', async () => {
    await profil.getProfile({ user: { id: 7 } }, antwort());
    assert.ok(/AS email_ausstehend/.test(aufrufe[0].sql));
  });

  console.log(`\n${geprueft} Prüfungen bestanden.`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
