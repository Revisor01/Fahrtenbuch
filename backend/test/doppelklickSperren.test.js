// Doppelklicks bei Mitfahrer-Sätzen und Favoriten dürfen keine Duplikate erzeugen. Aufruf: node test/doppelklickSperren.test.js

const assert = require('assert');
const fs = require('fs');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

const wurzel = __dirname + '/../';
const lies = (p) => fs.readFileSync(wurzel + p, 'utf8');

// --- 1. Die Regel in der Datenbank ----------------------------------------
console.log('\n1 — Ein Mitfahrer-Satz je Stichtag:');

const migration = lies('migrations/0013_mitfahrer_erstattung_unique.sql');

pruefe('die Migration setzt eine UNIQUE-Regel auf (user_id, gueltig_ab)', () => {
  assert.ok(/ADD UNIQUE KEY idx_mitfahrer_user_datum \(user_id, gueltig_ab\)/.test(migration));
});

pruefe('sie raeumt Altbestand vor dem Index weg', () => {
  const del = migration.indexOf('DELETE m1');
  const idx = migration.indexOf('ADD UNIQUE KEY');
  assert.ok(del > -1 && idx > del,
    'sonst scheitert das Anlegen an vorhandenen Duplikaten');
});

pruefe('von Duplikaten bleibt der zuletzt angelegte Satz', () => {
  assert.ok(/m1\.id < m2\.id/.test(migration),
    'der juengste (hoechste id) ist der, den die Nutzer:in zuletzt sah');
});

pruefe('die Migration ist wiederholbar', () => {
  // DDL committet implizit, die Datei muss wiederholbar sein.
  assert.ok(/information_schema\.STATISTICS/.test(migration),
    'der Index braucht eine Existenzpruefung — MySQL kennt kein IF NOT EXISTS');
  assert.ok(/PREPARE stmt FROM @sql/.test(migration));
  assert.ok(/DEALLOCATE PREPARE stmt/.test(migration));
});

pruefe('sie haelt sich an die Grenzen des Migrators', () => {
  // Er trennt zeilenweise am Semikolon und kennt nur --Kommentare.
  assert.ok(!/\/\*/.test(migration), 'kein Blockkommentar');
  for (const zeile of migration.split('\n')) {
    if (zeile.trim().startsWith('--')) {
      assert.ok(!zeile.includes(';'),
        `Semikolon im Kommentar bricht die Statement-Trennung: ${zeile.trim().slice(0, 50)}`);
    }
  }
});

pruefe('die Nummer ist frei und folgt auf die letzte', () => {
  const namen = fs.readdirSync(wurzel + 'migrations').filter((d) => d.endsWith('.sql'));
  const mit13 = namen.filter((n) => n.startsWith('0013_'));
  assert.strictEqual(mit13.length, 1, 'keine zweite 0013');
});

// --- 2. Die Sperren in der Oberflaeche ------------------------------------
console.log('\n2 — Der zweite Klick laeuft ins Leere:');

const frontend = __dirname + '/../../frontend/src/';
const satz = fs.readFileSync(frontend + 'components/einstellungen/SatzBausteine.js', 'utf8');
const fav = fs.readFileSync(frontend + 'components/einstellungen/FavoritenBereich.js', 'utf8');

for (const [name, quelle] of [['SatzSheet', satz], ['FavoritSheet', fav]]) {
  pruefe(`${name}: der zweite Klick kehrt sofort zurueck`, () => {
    assert.ok(/if \(speichert\) return;/.test(quelle));
  });

  pruefe(`${name}: der Knopf ist waehrend des Speicherns gesperrt`, () => {
    assert.ok(/disabled=\{speichert\}/.test(quelle));
    assert.ok(/Speichert …/.test(quelle), 'und sagt, dass etwas laeuft');
  });

  pruefe(`${name}: die Sperre loest im finally`, () => {
    assert.ok(/} finally {/.test(quelle),
      'sonst bleibt der Knopf nach einem Fehler dauerhaft gesperrt');
  });

  pruefe(`${name}: kein setState nach dem Unmount`, () => {
    // Beide Aufrufer schliessen das Sheet bei Erfolg.
    assert.ok(/montiertRef/.test(quelle));
    assert.ok(/if \(montiertRef\.current\) setSpeichert\(false\)/.test(quelle));
  });

  pruefe(`${name}: onSave wird abgewartet`, () => {
    assert.ok(/await onSave\(/.test(quelle),
      'ohne await loeste die Sperre sofort und der zweite Klick kaeme durch');
  });
}

// --- 3. Ungepruefte Antworten ---------------------------------------------
console.log('\n3 — .map auf der Antwort:');

const erst = fs.readFileSync(frontend + 'components/einstellungen/ErstattungBereich.js', 'utf8');

pruefe('die Traegerliste wird als Array geprueft', () => {
  assert.ok(/Array\.isArray\(response\.data\) \? response\.data : \[\]/.test(erst),
    'bei einer Fehlerantwort steht dort ein Objekt, .map warf einen TypeError');
});

pruefe('auch die Historie wird geprueft', () => {
  assert.ok(/Array\.isArray\(historieRes\.data\) \? historieRes\.data : \[\]/.test(erst));
});

console.log('\n' + geprueft + ' Pruefungen bestanden.');
