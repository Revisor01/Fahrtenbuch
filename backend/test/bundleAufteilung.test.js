// manualChunks darf dynamisch geladene Pakete nicht in den Start-Brocken ziehen. Aufruf: node test/bundleAufteilung.test.js

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
  // Nur null lässt Rolldown selbst entscheiden, ein Name hängt den Brocken an den Start.
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
    // Entscheidend ist, dass die Umsetzung in einer nachgeladenen Datei liegt; Restverweise im Startbundle sind gewollt.
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
    // React bleibt außen vor, es wuchs mit React 19 ohne Änderung der Aufteilung.
    const summe = startDateien
      .filter((d) => !/assets\/react-/.test(d))
      .reduce((s, d) => s + fs.statSync(frontend + 'build/' + d).size, 0);
    assert.ok(summe < 450_000,
      `Startlast ohne React ${summe} B — vor der Aufteilung waren es rund 533.000 B`);
  });
}

console.log('\n' + geprueft + ' Pruefungen bestanden.');
