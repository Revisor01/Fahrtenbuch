// Punkt 12 der Pre-Launch-Liste, Teilbefund „Frontend-Request-Sturm".
//
// updateAbrechnungsStatus laedt nach jedem Statuswechsel Fahrten UND
// Monatsdaten neu (refresh-Parameter, Vorgabe true). In den beiden
// Zeitraum-Schleifen lief das je Monat: bei zwoelf Monaten 24 Abrufe, von
// denen 22 sofort veraltet waren — direkt danach wird ohnehin einmal alles
// geholt. Das Rate-Limit liegt bei 600 Anfragen in fuenf Minuten, und wer
// eine Woche nachtraegt, lief hinein.
//
// Beide Schleifen geben jetzt refresh=false mit. An der Vorgabe aendert
// sich nichts — Einzelaufrufe ausserhalb einer Schleife sollen weiterhin
// aktualisieren.
//
// NICHT umgebaut: die 28 parallelen Monatsabrufe in fetchMonthlyData. Die
// vorhandene Sammel-Route /api/fahrten/monthly-summary liefert weder
// abrechnungsStatus noch kmProTraeger noch fahrtenCount; sie dafuer zu
// erweitern hiesse, eine Antwortform zu aendern, die ausgelieferte Apps
// lesen. Das gehoert in einen eigenen, geprueften Schritt.
//
// Laeuft ohne Test-Framework: `node test/requestSturm.test.js`.

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
  // Jeder updateAbrechnungsStatus-Aufruf mit sechs Argumenten (also ohne
  // refresh-Angabe) waere ein Kandidat. Erlaubt sind nur Einzelaufrufe.
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
      // Der letzte Parameter ist refresh. Ein Aufruf, der auf `, true)`
      // endet, hat ihn nicht gesetzt und laedt nach.
      assert.ok(!/, true\);?\s*$/.test(zeile.trim()),
        `${name}: Aufruf ohne refresh=false — ${zeile.trim().slice(0, 70)}`);
    }
  }
});

console.log('\n' + geprueft + ' Pruefungen bestanden.');
