// Datumsbereich statt YEAR()/MONTH() und Index (user_id, datum). Aufruf: node test/datumsIndex.test.js

const assert = require('assert');
const fs = require('fs');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}
const lies = (p) => fs.readFileSync(__dirname + '/../' + p, 'utf8');

const modell = lies('models/Fahrt.js');
const ctrl = lies('controllers/fahrtController.js');

// --- 1. Keine Funktion mehr um die Spalte ----------------------------------
console.log('\n1 — Datumsbereich statt YEAR()/MONTH():');

pruefe('das Modell filtert ueber einen Bereich', () => {
  assert.ok(/f\.datum >= \? AND f\.datum < \?/.test(modell));
});

pruefe('nirgends steht mehr YEAR() oder MONTH() in einem WHERE', () => {
  for (const [name, quelle] of [['models/Fahrt.js', modell],
                                ['controllers/fahrtController.js', ctrl]]) {
    assert.ok(!/WHERE[^;]*YEAR\(/.test(quelle),
      `${name} filtert noch mit YEAR() — der Index bleibt dann unbenutzt`);
    assert.ok(!/WHERE[^;]*MONTH\(/.test(quelle), `${name}: MONTH()`);
  }
});

pruefe('die Jahresuebersicht nutzt ebenfalls einen Bereich', () => {
  const abschnitt = ctrl.split('exports.getYearSummary')[1].split('\nexports.')[0];
  assert.ok(/f\.datum >= \? AND f\.datum < \?/.test(abschnitt));
  assert.ok(/-01-01/.test(abschnitt), 'Jahresgrenzen als Datum');
});

pruefe('der Nutzer steht im WHERE vorn — wie im Index', () => {
  assert.ok(/WHERE f\.user_id = \? AND f\.datum/.test(modell));
});

// --- 2. Die Monatsgrenzen ---------------------------------------------------
console.log('\n2 — Die Grenzen stimmen:');

const rumpf = modell.split('function monatsGrenzen(year, month) {')[1].split('\n}')[0];
// eslint-disable-next-line no-new-func
const monatsGrenzen = new Function('year', 'month', '{' + rumpf + '\n}');

pruefe('ein gewoehnlicher Monat', () => {
  assert.deepStrictEqual(monatsGrenzen(2026, 9), ['2026-09-01', '2026-10-01']);
});

pruefe('der Dezember laeuft ins Folgejahr', () => {
  assert.deepStrictEqual(monatsGrenzen(2026, 12), ['2026-12-01', '2027-01-01']);
});

pruefe('der Februar bleibt korrekt — auch im Schaltjahr', () => {
  // Obere Grenze exklusiv, die Monatslänge ist egal.
  assert.deepStrictEqual(monatsGrenzen(2024, 2), ['2024-02-01', '2024-03-01']);
  assert.deepStrictEqual(monatsGrenzen(2026, 2), ['2026-02-01', '2026-03-01']);
});

pruefe('nullgepolsterte Monate aus dem Pfad funktionieren', () => {
  assert.deepStrictEqual(monatsGrenzen('2026', '06'), ['2026-06-01', '2026-07-01']);
  assert.deepStrictEqual(monatsGrenzen('2026', '01'), ['2026-01-01', '2026-02-01']);
});

pruefe('die obere Grenze ist exklusiv, nicht der Monatsletzte', () => {
  // `<` statt `<=`, damit eine Uhrzeit nie herausfällt.
  const [, bis] = monatsGrenzen(2026, 9);
  assert.strictEqual(bis, '2026-10-01');
});

// --- 3. Der Index -----------------------------------------------------------
console.log('\n3 — Der Index passt zur Abfrage:');

const migration = lies('migrations/0014_index_fahrten_user_datum.sql');

pruefe('er steht in der Reihenfolge user_id, datum', () => {
  assert.ok(/ADD INDEX idx_fahrten_user_datum \(user_id, datum\)/.test(migration),
    'die umgekehrte Reihenfolge gibt es schon — sie hilft hier nicht');
});

pruefe('die Migration ist wiederholbar', () => {
  assert.ok(/information_schema\.STATISTICS/.test(migration));
  assert.ok(/PREPARE stmt FROM @sql/.test(migration));
  assert.ok(/DEALLOCATE PREPARE stmt/.test(migration));
});

pruefe('sie haelt sich an die Grenzen des Migrators', () => {
  // Eine Kommentarzeile, die auf ein Semikolon endet, schnitte im Migrator ein Statement ab.
  assert.ok(!/\/\*/.test(migration), 'kein Blockkommentar');
  for (const zeile of migration.split('\n')) {
    const t = zeile.trim();
    if (t.startsWith('--')) {
      assert.ok(!t.endsWith(';'),
        `Kommentarzeile endet auf Semikolon und trennt das Statement: ${t.slice(0, 50)}`);
    }
  }
});

pruefe('der alte Index wird nicht im selben Zug entfernt', () => {
  // Bleibt als Rückfallweg.
  assert.ok(!/DROP INDEX/.test(migration));
});

pruefe('die Messung steht in der Migration', () => {
  // Damit beim naechsten Lesen nachvollziehbar ist, warum es den Index gibt.
  assert.ok(/gepruefte Zeilen/.test(migration));
});

console.log('\n' + geprueft + ' Pruefungen bestanden.');
