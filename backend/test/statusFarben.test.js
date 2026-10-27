// Statusfarben für Punkt und Wort („Erfasst“, „Eingereicht“, „Erstattet“):
// Zuordnungstabelle mit festen Klassennamen (Unbekanntes neutral), Regeln im
// CSS und Kontrast nach WCAG 2.2 (mindestens 4,5:1) in hell und dunkel, auch
// in erstatteten Monatskarten mit verminderter Deckkraft.
//
// Läuft ohne Test-Framework: `node test/statusFarben.test.js`.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

const basis = path.join(__dirname, '..', '..', 'frontend', 'src');
const lies = (datei) => fs.readFileSync(path.join(basis, datei), 'utf8');
const css = lies('index.css');
const tokens = lies('tokens.css');
const badge = lies('components/ui/StatusBadge.js');

// --- Farben aus tokens.css -------------------------------------------------
function tokenBlock(selektor) {
  const start = tokens.indexOf(selektor + ' {');
  assert.ok(start > -1, `Block ${selektor} fehlt in tokens.css`);
  const block = tokens.slice(start, tokens.indexOf('}', start));
  const werte = {};
  for (const [, name, wert] of block.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})/g)) werte[name] = wert;
  return werte;
}
const MODI = {
  hell: tokenBlock(':root'),
  dunkel: tokenBlock('.dark, [data-theme="dark"]'),
};

const kanal = (hex, i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
const rgb = (hex) => [0, 1, 2].map((i) => kanal(hex, i));
function luminanz(farbe) {
  const [r, g, b] = farbe.map((x) => {
    const c = x / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function kontrast(a, b) {
  const [hell, dunkel] = [luminanz(a), luminanz(b)].sort((x, y) => y - x);
  return (hell + 0.05) / (dunkel + 0.05);
}
const mische = (oben, unten, alpha) => oben.map((x, i) => x * alpha + unten[i] * (1 - alpha));

// Farbe aus einer Regel `selektor { color: var(--x); }` in index.css
function farbToken(selektor) {
  const muster = new RegExp(
    selektor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{\\s*color:\\s*var\\(--([\\w-]+)\\);\\s*\\}');
  const treffer = css.match(muster);
  assert.ok(treffer, `Regel ${selektor} { color: var(--…) } fehlt in index.css`);
  return treffer[1];
}

(async () => {
  const labels = await import(pathToFileURL(path.join(basis, 'utils', 'statusLabels.js')).href);
  const { STATUS_KLASSEN, STATUS_ORDER, statusKlassen } = labels;

  console.log('\n1 — Zuordnungstabelle:');

  pruefe('jeder Status bekommt seine feste Klasse', () => {
    assert.deepStrictEqual(statusKlassen('offen'), { badge: 'status-erfasst', dot: 'status-dot-offen' });
    assert.deepStrictEqual(statusKlassen('eingereicht'), { badge: 'status-eingereicht', dot: 'status-dot-eingereicht' });
    assert.deepStrictEqual(statusKlassen('erhalten'), { badge: 'status-erstattet', dot: 'status-dot-erhalten' });
  });

  pruefe('die Tabelle deckt genau die drei Stationen ab', () => {
    assert.deepStrictEqual(Object.keys(STATUS_KLASSEN), STATUS_ORDER);
  });

  pruefe('unbekannter Status fällt auf die neutrale Darstellung', () => {
    for (const wert of [undefined, null, '', 'abgelehnt', 'ERHALTEN', 'toString', '__proto__']) {
      assert.deepStrictEqual(statusKlassen(wert), { badge: 'status-erfasst', dot: 'status-dot-offen' },
        `für ${String(wert)}`);
    }
  });

  console.log('\n2 — Komponente und CSS:');

  pruefe('StatusBadge setzt die Klassen aus der Tabelle, nicht aus dem Statuswert', () => {
    assert.ok(!/status-dot-\$\{/.test(badge), 'Klassenname wird wieder zusammengesetzt');
    assert.ok(/statusKlassen\(status\)\.dot/.test(badge), 'Punkt nutzt die Tabelle nicht');
    assert.ok(/statusKlassen\(status\)\.badge/.test(badge), 'Pille nutzt die Tabelle nicht');
  });

  pruefe('jede Klasse aus der Tabelle hat Wortfarbe und Punktfarbe im CSS', () => {
    for (const { dot, badge: pille } of Object.values(STATUS_KLASSEN)) {
      farbToken('.' + dot);
      assert.ok(css.includes(`.${dot} .status-dot-circle {`), `Punkt für ${dot} fehlt`);
      assert.ok(new RegExp(`\\.${pille}[\\s,{]`).test(css), `Pille ${pille} fehlt`);
    }
  });

  console.log('\n3 — Kontrast (WCAG AA, mindestens 4,5:1):');

  const flaechen = ['surface', 'bg', 'surface-2'];
  for (const [modus, t] of Object.entries(MODI)) {
    for (const { dot } of Object.values(STATUS_KLASSEN)) {
      const token = farbToken('.' + dot);
      pruefe(`${modus}: ${dot} (--${token} ${t[token]})`, () => {
        for (const flaeche of flaechen) {
          const wert = kontrast(rgb(t[token]), rgb(t[flaeche]));
          assert.ok(wert >= 4.5, `${modus} ${dot} auf --${flaeche}: ${wert.toFixed(2)}:1`);
        }
      });
    }
  }

  pruefe('erstattete Monatskarte: Wort bleibt trotz Deckkraft lesbar', () => {
    const deckkraft = parseFloat(css.match(/\.abr-karte-erstattet\s*\{\s*opacity:\s*([\d.]+);/)[1]);
    assert.ok(deckkraft < 1, 'die Karte tritt weiter zurück');
    const token = farbToken('.abr-karte-erstattet .status-dot');
    for (const [modus, t] of Object.entries(MODI)) {
      const unten = rgb(t.bg);
      const text = mische(rgb(t[token]), unten, deckkraft);
      const grund = mische(rgb(t.surface), unten, deckkraft);
      const wert = kontrast(text, grund);
      assert.ok(wert >= 4.5, `${modus}: ${wert.toFixed(2)}:1`);
    }
  });

  console.log('\n' + geprueft + ' Pruefungen bestanden.');
})().catch((fehler) => {
  console.error(fehler);
  process.exit(1);
});
