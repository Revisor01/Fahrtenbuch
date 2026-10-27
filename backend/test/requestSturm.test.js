// Statuswechsel in Zeitraum-Schleifen laden nicht je Monat nach (refresh=false). Aufruf: node test/requestSturm.test.js

const assert = require('assert');
const fs = require('fs');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

const basis = __dirname + '/../../frontend/src/';
const ctx = fs.readFileSync(basis + 'contexts/AppContext.js', 'utf8');
const exportHook = fs.readFileSync(basis + 'components/fahrten/useFahrtenExport.js', 'utf8');

// --- 1. Die Vorgabe bleibt ------------------------------------------------
console.log('\n1 — Einzelaufrufe aktualisieren weiterhin:');

pruefe('refresh ist weiterhin standardmaessig an', () => {
  assert.ok(/refresh = true\) => \{/.test(ctx),
    'ein Einzelaufruf ausserhalb einer Schleife muss aktualisieren');
});

pruefe('der Refresh-Block existiert unveraendert', () => {
  const fn = ctx.split('const updateAbrechnungsStatus = async')[1].split('\n  };')[0];
  assert.ok(/if \(refresh\) \{/.test(fn));
  assert.ok(/await fetchFahrten\(\)/.test(fn));
  assert.ok(/await fetchMonthlyData\(\)/.test(fn));
});

// --- 2. Die Schleifen sparen ----------------------------------------------
console.log('\n2 — In Schleifen wird nicht je Monat nachgeladen:');

pruefe('die Zeitraum-Schleife im Context gibt refresh=false mit', () => {
  const fn = ctx.split('const handleAbrechnungsStatus = async')[1].split('\n  };')[0];
  const schleife = fn.split('while (current <= end)')[1].split('}')[0];
  assert.ok(/datum, true, false\)/.test(schleife),
    'sonst laedt jeder Monat der Schleife alles neu');
});

pruefe('auch der Einzelzweig daneben laedt nicht doppelt', () => {
  // Direkt danach folgt ohnehin fetchMonthlyData + fetchFahrten.
  const fn = ctx.split('const handleAbrechnungsStatus = async')[1].split('\n  };')[0];
  const sonst = fn.split('} else {')[1].split('}')[0];
  assert.ok(/datum, true, false\)/.test(sonst));
});

pruefe('danach wird genau einmal aktualisiert', () => {
  const fn = ctx.split('const handleAbrechnungsStatus = async')[1].split('\n  };')[0];
  assert.strictEqual((fn.match(/await fetchMonthlyData\(\)/g) || []).length, 1);
  assert.strictEqual((fn.match(/await fetchFahrten\(\)/g) || []).length, 1);
});

pruefe('die Schleife im Export-Toast gibt refresh=false mit', () => {
  const block = exportHook.split("actionLabel")[1] || exportHook;
  const stelle = exportHook.indexOf('for (const mk of exportedMonths)');
  assert.ok(stelle > -1);
  const schleife = exportHook.slice(stelle, stelle + 400);
  assert.ok(/today, true, false\)/.test(schleife));
});

pruefe('und aktualisiert danach einmal', () => {
  const stelle = exportHook.indexOf('for (const mk of exportedMonths)');
  const danach = exportHook.slice(stelle, stelle + 800);
  assert.ok(/await fetchMonthlyData\(\)/.test(danach));
  assert.ok(/await fetchFahrten\(\)/.test(danach));
});

// --- 3. Keine Stelle wurde uebersehen --------------------------------------
console.log('\n3 — Alle Schleifen erfasst:');

pruefe('kein Aufruf in einer Schleife laedt mehr nach', () => {
  // Ohne refresh-Angabe nur Einzelaufrufe.
  const dateien = {
    'contexts/AppContext.js': ctx,
    'components/fahrten/useFahrtenExport.js': exportHook,
    'components/abrechnung/useEinreichen.js': fs.readFileSync(basis + 'components/abrechnung/useEinreichen.js', 'utf8'),
    'components/Dashboard.js': fs.readFileSync(basis + 'components/Dashboard.js', 'utf8'),
  };
  for (const [name, inhalt] of Object.entries(dateien)) {
    for (const zeile of inhalt.split('\n')) {
      if (!zeile.includes('updateAbrechnungsStatus(')) continue;
      if (zeile.includes('const updateAbrechnungsStatus')) continue;
      // Endet der Aufruf auf `, true)`, lädt er nach.
      assert.ok(!/, true\);?\s*$/.test(zeile.trim()),
        `${name}: Aufruf ohne refresh=false — ${zeile.trim().slice(0, 70)}`);
    }
  }
});

console.log('\n' + geprueft + ' Pruefungen bestanden.');
