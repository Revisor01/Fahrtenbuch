// Punkt 10 der Pre-Launch-Liste: manualChunks machte die Lazy-Imports
// wirkungslos.
//
// `if (!id.includes('node_modules')) return; … return 'vendor'` warf JEDES
// Paket aus node_modules in den `vendor`-Brocken — auch die zehn, die der
// Code ausdruecklich dynamisch laedt. Rollup legt ein Modul dorthin, wo
// manualChunks es hinschickt; der Brocken haengt dann am Start. Der
// Web-Nutzer lud so jszip, pako und saemtliche Capacitor-Plugins mit,
// obwohl er sie nie anfordert.
//
// Gemessen (24.09.2026, `npm run build`, Startlast = die in index.html
// referenzierten Skripte):
//   vorher  672.526 B roh / 203.187 B gzip
//   nachher 542.929 B roh / 163.707 B gzip
//   also 39.480 B gzip weniger, rund 19 %.
//
// Geprueft wird hier die Regel in vite.config.js und, falls ein Build
// vorliegt, dessen Ergebnis.
//
// Laeuft ohne Test-Framework: `node test/bundleAufteilung.test.js`.

const assert = require('assert');
const fs = require('fs');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

const frontend = __dirname + '/../../frontend/';
const config = fs.readFileSync(frontend + 'vite.config.js', 'utf8');

// --- 1. Die Regel ---------------------------------------------------------
console.log('\n1 — Die Aufteilungsregel:');

pruefe('dynamisch geladene Pakete werden ausgenommen', () => {
  const chunks = config.split('name(id)')[1].split('} }]')[0];
  assert.ok(/jszip\|pako\|@capacitor\|@capgo\|@aparajita/.test(chunks),
    'ohne diese Ausnahme landet alles in vendor und haengt am Start');
});

pruefe('die Ausnahme steht VOR dem vendor-Auffang', () => {
  const chunks = config.split('name(id)')[1].split('} }]')[0];
  assert.ok(chunks.indexOf('jszip|pako') < chunks.indexOf("return 'vendor'"),
    'danach griffe sie nie');
});

pruefe('die Ausnahme gibt null zurueck', () => {
  // Ein Name — auch ein eigener — haenge den Brocken wieder an den Start.
  // Nur mit null entscheidet Rolldown (Vite 8, codeSplitting.groups) selbst.
  const chunks = config.split('name(id)')[1].split('} }]')[0];
  const zeile = chunks.split('\n').find((z) => z.includes('jszip|pako'));
  assert.ok(/\) return null;\s*$/.test(zeile.trim()),
    `muss mit "return null;" enden, steht aber: ${zeile.trim()}`);
});

pruefe('die uebrigen Brocken bleiben wie sie waren', () => {
  assert.ok(/return 'react'/.test(config));
  assert.ok(/return 'router'/.test(config));
  assert.ok(/return 'icons'/.test(config));
  assert.ok(/return 'vendor'/.test(config));
});

// --- 2. Das Ergebnis im Build ---------------------------------------------
console.log('\n2 — Das gebaute Ergebnis:');

const indexPfad = frontend + 'build/index.html';
if (!fs.existsSync(indexPfad)) {
  console.log('  -   uebersprungen: kein Build vorhanden (npm run build)');
} else {
  const html = fs.readFileSync(indexPfad, 'utf8');
  const startDateien = [...new Set(
    (html.match(/assets\/[a-zA-Z0-9_.-]+\.js/g) || [])
  )];

  pruefe('index.html laedt ueberhaupt Startskripte', () => {
    assert.ok(startDateien.length > 0);
  });

  const startInhalt = startDateien
    .map((d) => fs.readFileSync(frontend + 'build/' + d, 'utf8'))
    .join('\n');

  pruefe('pako haengt nicht mehr am Start', () => {
    // pako steckt in jszip und wird nur fuer den ZIP-Export gebraucht.
    assert.ok(!/pako/.test(startInhalt),
      'pako gehoert zum ZIP-Export, nicht zum App-Start');
  });

  pruefe('von den Capacitor-Plugins steht nur noch der Ladeaufruf im Start', () => {
    // Nicht auf das blosse Vorkommen des Namens pruefen: Der dynamische
    // Import laesst zwangslaeufig ein `.then(t => t.SecureStorage)` im
    // Startbundle zurueck — das ist der Zweck der Sache. Entscheidend ist,
    // dass die Umsetzung in einer NACHGELADENEN Datei liegt.
    // Gemessen nach der Aenderung: SecureStorage 1, NativeNavigation 3 —
    // letzteres steht dreimal in derselben Destrukturierungs-Zeile des
    // dynamischen Imports (`const {NativeNavigation: s} = await …`), nicht
    // als Plugin-Code. Vorher waren es 7 bzw. 5 samt Umsetzung.
    for (const [nadel, grenze] of [['SecureStorage', 2], ['NativeNavigation', 3]]) {
      const treffer = (startInhalt.match(new RegExp(nadel, 'g')) || []).length;
      assert.ok(treffer <= grenze,
        `${nadel} kommt ${treffer}-mal im Startbundle vor (erlaubt: ${grenze}) — `
        + 'vor der Aenderung lag dort die ganze Umsetzung');
    }
  });

  pruefe('die Umsetzung der Plugins liegt in nachgeladenen Dateien', () => {
    const alleDateien = fs.readdirSync(frontend + 'build/assets')
      .filter((d) => d.endsWith('.js'));
    const nachgeladen = alleDateien.filter((d) => !startDateien.includes('assets/' + d));
    const inhalt = nachgeladen
      .map((d) => fs.readFileSync(frontend + 'build/assets/' + d, 'utf8'))
      .join('\n');
    assert.ok(/SecureStorageWeb|SecureStorageNative/.test(inhalt),
      'die eigentliche Umsetzung muss ausserhalb der Startlast liegen');
  });

  pruefe('jszip liegt in einer eigenen Datei', () => {
    const eigene = fs.readdirSync(frontend + 'build/assets')
      .filter((d) => /jszip/i.test(d) && d.endsWith('.js'));
    assert.ok(eigene.length > 0, 'jszip muss nachladbar sein');
    assert.ok(!startDateien.some((d) => /jszip/i.test(d)),
      'und darf nicht in index.html stehen');
  });

  pruefe('die Startlast ohne React bleibt unter 450 kB roh', () => {
    // React selbst bleibt aussen vor: Mit React 19 wuchs der react-Brocken
    // von 138.769 auf 210.909 B, ohne dass sich an der Aufteilung etwas
    // aenderte (27.10.2026). Ohne ihn: vorher 408.258 B, mit React 19 und
    // Vite 8 415.362 B; der alte Rueckfall laege bei rund 533.000 B.
    const summe = startDateien
      .filter((d) => !/assets\/react-/.test(d))
      .reduce((s, d) => s + fs.statSync(frontend + 'build/' + d).size, 0);
    assert.ok(summe < 450_000,
      `Startlast ohne React ${summe} B — vor der Aufteilung waren es rund 533.000 B`);
  });
}

console.log('\n' + geprueft + ' Pruefungen bestanden.');
