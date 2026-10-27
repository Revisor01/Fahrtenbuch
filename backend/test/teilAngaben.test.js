// Teilangaben ohne Serverfehler (27.10.2026).
//
// Gefunden mit der API-Vertragspruefung: Ein Profil mit nur einem Teil der
// Felder und ein Mitfahrer ohne Arbeitsstaette endeten in einem 500, weil
// undefined als SQL-Parameter an mysql2 ging (und arbeitsstaette NOT NULL
// ist). Die Apps senden alle Felder, Kurzbefehle und API-Nutzer nicht
// unbedingt.
//
// Laeuft ohne Test-Framework und ohne Datenbank: `node test/teilAngaben.test.js`.

const assert = require('assert');
const path = require('path');

let geprueft = 0;
async function pruefe(beschreibung, fn) {
  await fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

// Datenbank und Mailversand ersetzen, bevor der Controller sie laedt.
const aufrufe = [];
let bestand = [];
const verbindung = {
  beginTransaction: async () => {},
  commit: async () => {},
  rollback: async () => {},
  release: () => {},
  execute: async (sql, params) => {
    aufrufe.push({ sql, params });
    if (params.some((p) => p === undefined)) {
      throw new TypeError('Bind parameters must not contain undefined. To pass SQL NULL specify JS null');
    }
    if (/^SELECT \* FROM user_profiles/.test(sql)) return [bestand];
    return [{ affectedRows: 1 }];
  },
};
const dbAttrappe = { getConnection: async () => verbindung, execute: verbindung.execute };
const ersetze = (modul, exportsWert) => {
  const pfad = require.resolve(path.join(__dirname, '..', modul));
  require.cache[pfad] = { id: pfad, filename: pfad, loaded: true, exports: exportsWert };
};
ersetze('config/database', dbAttrappe);
ersetze('services/mailService', { sendEmailVerification: async () => {} });

const profileController = require('../controllers/profileController');
const { updateProfileSchema } = require('../schemas/profileSchemas');
const {
  createFahrtSchema, updateFahrtSchema, addMitfahrerSchema, updateMitfahrerSchema,
} = require('../schemas/fahrtSchemas');

function antwortAttrappe() {
  const r = { statusCode: 200, body: null };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
}

async function speichereProfil(body) {
  aufrufe.length = 0;
  const res = antwortAttrappe();
  await profileController.updateProfile(
    { body: updateProfileSchema.parse(body), user: { id: 7 } }, res,
  );
  return res;
}

(async () => {
  console.log('\n1 — Profil mit Teilangaben:');

  const vorhanden = {
    user_id: 7, email: 'a@example.org', full_name: 'Alt Name', iban: 'DE00',
    kirchengemeinde: 'Heide', kirchspiel: 'West', kirchenkreis: 'Dithmarschen',
  };

  await pruefe('nur der Name: 200, die uebrigen Felder bleiben wie gespeichert', async () => {
    bestand = [vorhanden];
    const res = await speichereProfil({ fullName: 'Neu Name' });
    assert.strictEqual(res.statusCode, 200, JSON.stringify(res.body));
    assert.deepStrictEqual(res.body, { message: 'Profil erfolgreich aktualisiert.' });
    const update = aufrufe.find((a) => /^UPDATE user_profiles/.test(a.sql));
    assert.deepStrictEqual(update.params,
      ['a@example.org', 'Neu Name', 'DE00', 'Heide', 'West', 'Dithmarschen', 7]);
  });

  await pruefe('null leert ein Feld weiterhin (so senden es die Apps)', async () => {
    bestand = [vorhanden];
    const res = await speichereProfil({
      email: 'a@example.org', fullName: 'Alt Name', iban: null,
      kirchengemeinde: 'Heide', kirchspiel: null, kirchenkreis: 'Dithmarschen',
    });
    assert.strictEqual(res.statusCode, 200);
    const update = aufrufe.find((a) => /^UPDATE user_profiles/.test(a.sql));
    assert.deepStrictEqual(update.params,
      ['a@example.org', 'Alt Name', null, 'Heide', null, 'Dithmarschen', 7]);
  });

  await pruefe('ohne bestehendes Profil: fehlende Felder werden null', async () => {
    bestand = [];
    const res = await speichereProfil({ kirchengemeinde: 'Meldorf' });
    assert.strictEqual(res.statusCode, 200);
    const insert = aufrufe.find((a) => /^INSERT INTO user_profiles/.test(a.sql));
    assert.deepStrictEqual(insert.params, [7, null, null, null, 'Meldorf', null, null]);
  });

  console.log('\n2 — Mitfahrer ohne Arbeitsstaette:');

  const fahrt = { datum: '2026-10-01', anlass: 'Besuch', abrechnung: 1, vonOrtId: 1, nachOrtId: 2 };
  for (const [name, parse] of [
    ['einzeln hinzufuegen', (m) => addMitfahrerSchema.parse(m)],
    ['einzeln aendern', (m) => updateMitfahrerSchema.parse(m)],
    ['mit neuer Fahrt', (m) => createFahrtSchema.parse({ ...fahrt, mitfahrer: [m] }).mitfahrer[0]],
    ['mit geaenderter Fahrt', (m) => updateFahrtSchema.parse({ ...fahrt, mitfahrer: [m] }).mitfahrer[0]],
  ]) {
    await pruefe(`${name}: fehlend und null werden zu leerem Text`, () => {
      assert.strictEqual(parse({ name: 'Max' }).arbeitsstaette, '');
      assert.strictEqual(parse({ name: 'Max', arbeitsstaette: null }).arbeitsstaette, '');
    });
    await pruefe(`${name}: angegebene Arbeitsstaette bleibt`, () => {
      assert.strictEqual(parse({ name: 'Max', arbeitsstaette: 'Meldorf' }).arbeitsstaette, 'Meldorf');
      assert.strictEqual(parse({ name: 'Max', arbeitsstaette: '' }).arbeitsstaette, '');
    });
  }

  console.log('\n' + geprueft + ' Pruefungen bestanden.');
})().catch((fehler) => {
  console.error(fehler);
  process.exit(1);
});
