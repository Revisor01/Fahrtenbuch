// Punkt 11 der Pre-Launch-Liste: API-Schluessel lagen im Klartext.
//
// `api_keys.api_key` enthielt den Schluessel so, wie ihn der Kurzbefehl auf
// dem iPhone mitschickt. Wer ein Datenbank-Backup in die Haende bekam, hatte
// damit dauerhaft nutzbare Zugaenge — die Schluessel laufen nicht ab.
//
// Der heikle Punkt war die Umstellung: Ein harter Schnitt haette alle
// bestehenden Kurzbefehle auf einen Schlag ungueltig gemacht, und der
// Klartext liesse sich nirgends wiederbeschaffen. Migration 0015 ueberfuehrt
// sie deshalb per SHA2 in Hashes, statt sie zu loeschen.
//
// Gegen eine echte MySQL 8.4 gemessen: Nach der Migration findet ein
// BESTEHENDER Schluessel weiterhin sein Konto, ein falscher wird abgewiesen,
// neue Schluessel entstehen ohne Klartext, und ein zweiter Lauf der
// Migration geht fehlerfrei durch.
//
// Laeuft ohne Test-Framework: `node test/apiKeyHash.test.js`.

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}
const lies = (p) => fs.readFileSync(__dirname + '/../' + p, 'utf8');

const modell = lies('models/ApiKey.js');
const migration = lies('migrations/0015_api_keys_hashen.sql');

// --- 1. Das Modell ---------------------------------------------------------
console.log('\n1 — Nur der Hash geht in die Datenbank:');

pruefe('generate schreibt api_key_hash, nicht api_key', () => {
  const fn = modell.split('static async generate(')[1].split('\n    }')[0];
  assert.ok(/INSERT INTO api_keys \(user_id, api_key_hash, description\)/.test(fn));
  assert.ok(/hashe\(key\)/.test(fn));
});

pruefe('der Klartext wird weiterhin einmal zurueckgegeben', () => {
  // Die Nutzer:in braucht ihn — danach ist er nirgends mehr abrufbar.
  const fn = modell.split('static async generate(')[1].split('\n    }')[0];
  assert.ok(/return \{ id: result\.insertId, key \}/.test(fn));
});

pruefe('validate sucht ueber den Hash', () => {
  const fn = modell.split('static async validate(')[1].split('\n    }')[0];
  assert.ok(/ak\.api_key_hash = \?/.test(fn));
  assert.ok(/hashe\(key\)/.test(fn));
});

pruefe('validate faellt waehrend der Umstellung auf den Klartext zurueck', () => {
  // Zwischen Deploy und Migrationslauf steht der Hash noch nicht. Ohne den
  // Rueckfall faenden bestehende Kurzbefehle in diesem Moment ihr Konto
  // nicht mehr.
  const fn = modell.split('static async validate(')[1].split('\n    }')[0];
  assert.ok(/api_key_hash IS NULL AND ak\.api_key = \?/.test(fn));
});

pruefe('listForUser gibt weder Schluessel noch Hash heraus', () => {
  const fn = modell.split('static async listForUser(')[1].split('\n    }')[0];
  // Nur die Spaltenliste pruefen — `api_keys` ist der Tabellenname.
  const auswahl = fn.split('SELECT')[1].split('FROM')[0];
  assert.ok(!/api_key/.test(auswahl),
    'die Liste zeigt nur Beschreibung und Zeiten, weder Schluessel noch Hash');
});

pruefe('validate liefert den Hash nicht mit zurueck', () => {
  const fn = modell.split('static async validate(')[1].split('\n    }')[0];
  const auswahl = fn.split('FROM api_keys')[0];
  assert.ok(!/ak\.api_key\b/.test(auswahl),
    'der Hash landete sonst ueber req.user in weiteren Antworten');
});

// --- 2. Das Hash-Verfahren --------------------------------------------------
console.log('\n2 — Node und MySQL rechnen gleich:');

const rumpf = modell.split('function hashe(key) {')[1].split('\n}')[0];
// eslint-disable-next-line no-new-func
const hashe = new Function('crypto', 'key', '{' + rumpf + '\n}').bind(null, crypto);

pruefe('der Hash ist 64 Zeichen lang und stabil', () => {
  const h = hashe('beispiel');
  assert.strictEqual(h.length, 64);
  assert.strictEqual(h, hashe('beispiel'));
});

pruefe('er stimmt mit SHA2(..., 256) aus MySQL ueberein', () => {
  // Die Migration fuellt die Spalte mit SHA2(api_key, 256). Weichen die
  // Verfahren ab, findet nach der Migration KEIN bestehender Schluessel mehr
  // sein Konto. Gegengeprueft an MySQL 8.4:
  //   SELECT SHA2('test-schluessel-123', 256)
  //   -> 906c6b3bb8db7932749f522615fec6807b1696d788199780446b25b57d7bb8fb
  assert.strictEqual(
    hashe('test-schluessel-123'),
    '906c6b3bb8db7932749f522615fec6807b1696d788199780446b25b57d7bb8fb'
  );
});

pruefe('verschiedene Schluessel ergeben verschiedene Hashes', () => {
  assert.notStrictEqual(hashe('a'.repeat(64)), hashe('b'.repeat(64)));
});

// --- 3. Die Migration -------------------------------------------------------
console.log('\n3 — Kein Schluessel geht verloren:');

pruefe('bestehende Schluessel werden uebernommen, nicht geloescht', () => {
  assert.ok(/SET api_key_hash = SHA2\(api_key, 256\)/.test(migration));
  assert.ok(!/DELETE FROM api_keys/.test(migration),
    'ein harter Schnitt haette jeden Kurzbefehl ungueltig gemacht');
});

pruefe('der Klartext wird erst nach dem Uebernehmen geleert', () => {
  assert.ok(migration.indexOf('SET api_key_hash = SHA2')
    < migration.indexOf('SET api_key = NULL'));
});

pruefe('die Spalte wird NULL-faehig, BEVOR sie geleert wird', () => {
  // Sie ist als NOT NULL angelegt. In der ersten Fassung stand das Leeren
  // davor — MySQL 8.4 brach mit „Column 'api_key' cannot be null" ab.
  assert.ok(migration.indexOf('MODIFY COLUMN api_key VARCHAR(64) NULL')
    < migration.indexOf('SET api_key = NULL'));
});

pruefe('die Spalte bleibt bestehen, nur leer', () => {
  assert.ok(!/DROP COLUMN api_key/.test(migration),
    'ein DROP waere nicht zurueckzunehmen, falls beim Ausrollen etwas auffaellt');
});

pruefe('der Hash traegt eine Eindeutigkeitsregel', () => {
  assert.ok(/ADD UNIQUE KEY uniq_api_key_hash \(api_key_hash\)/.test(migration));
});

pruefe('die Migration ist wiederholbar', () => {
  assert.ok(/information_schema\.COLUMNS/.test(migration));
  assert.ok(/information_schema\.STATISTICS/.test(migration));
  const vorbereitungen = (migration.match(/PREPARE stmt FROM @sql/g) || []).length;
  const freigaben = (migration.match(/DEALLOCATE PREPARE stmt/g) || []).length;
  assert.strictEqual(vorbereitungen, freigaben, 'jedes PREPARE braucht ein DEALLOCATE');
});

pruefe('sie haelt sich an die Grenzen des Migrators', () => {
  assert.ok(!/\/\*/.test(migration), 'kein Blockkommentar');
  for (const zeile of migration.split('\n')) {
    const t = zeile.trim();
    if (t.startsWith('--')) {
      assert.ok(!t.endsWith(';'), `Kommentarzeile endet auf Semikolon: ${t.slice(0, 50)}`);
    }
  }
});

console.log('\n' + geprueft + ' Pruefungen bestanden.');
