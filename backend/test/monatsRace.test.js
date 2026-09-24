// Punkt 15 der Pre-Launch-Liste, Teilbefund „Race beim Monatswechsel".
//
// fetchFahrten hatte keine Request-Nummer. Der vorhandene `sitzungsZaehler`
// half nicht: Er steigt nur bei An- und Abmeldung (AppContext: login,
// logout). Zwei Abrufe derselben Sitzung — etwa beim schnellen Blaettern
// zwischen Monaten — trugen dieselbe Nummer, beide Guards griffen nie.
// Antwortete der aeltere Abruf spaeter, ueberschrieb er den neueren: die
// Fahrten von Monat A unter der Ueberschrift von Monat B.
//
// In einer Abrechnungs-App ist das die falscheste Zahl an der sichtbarsten
// Stelle: Der Monatsbetrag stimmt nicht mit dem angezeigten Monat ueberein.
//
// Geprueft wird die Struktur im Quelltext und die Reihenfolge-Logik als
// Nachbau.
//
// Laeuft ohne Test-Framework: `node test/monatsRace.test.js`.

const assert = require('assert');
const fs = require('fs');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

const ctx = fs.readFileSync(
  __dirname + '/../../frontend/src/contexts/AppContext.js', 'utf8');
const fetchFahrten = ctx.split('const fetchFahrten = async')[1].split('\n  const addOrt')[0];

// --- 1. Struktur ----------------------------------------------------------
console.log('\n1 — Jeder Abruf bekommt eine Nummer:');

pruefe('es gibt einen eigenen Zaehler fuer Fahrten-Abrufe', () => {
  assert.ok(/const fahrtenAbrufNr = useRef\(0\)/.test(ctx));
});

pruefe('der Zaehler steigt bei JEDEM Abruf', () => {
  assert.ok(/const abruf = \+\+fahrtenAbrufNr\.current;/.test(fetchFahrten),
    'Praeinkrement: die eigene Nummer muss die neue sein');
});

pruefe('der Sitzungszaehler bleibt daneben bestehen', () => {
  // Er deckt einen anderen Fall ab (Instanz-/Sitzungswechsel) und darf
  // nicht ersetzt werden.
  assert.ok(/const sitzung = sitzungsZaehler\.current;/.test(fetchFahrten));
  const treffer = (ctx.match(/sitzungsZaehler\.current \+= 1/g) || []).length;
  assert.strictEqual(treffer, 2, 'nur login und logout erhoehen ihn');
});

pruefe('beide Guards greifen beim Erfolg', () => {
  const erfolg = fetchFahrten.split('catch (error)')[0];
  assert.ok(/if \(sitzungVorbei\(sitzung\) \|\| ueberholt\(\)\) return;/.test(erfolg));
});

pruefe('beide Guards greifen auch im Fehlerfall', () => {
  const fehler = fetchFahrten.split('catch (error)')[1];
  assert.ok(/if \(sitzungVorbei\(sitzung\) \|\| ueberholt\(\)\) return;/.test(fehler),
    'sonst leert der alte Abruf die Liste, die der neue gerade fuellt');
});

pruefe('der Guard steht VOR jedem Schreiben', () => {
  const erfolg = fetchFahrten.split('catch (error)')[0];
  assert.ok(erfolg.indexOf('ueberholt()') < erfolg.indexOf('setFahrten('));
  // setSummary und setFahrtenFehler liegen im selben Block dahinter.
  assert.ok(erfolg.indexOf('ueberholt()') < erfolg.indexOf('setSummary('));
  assert.ok(erfolg.indexOf('ueberholt()') < erfolg.indexOf('setFahrtenFehler('));
});

// --- 2. Die Logik ---------------------------------------------------------
console.log('\n2 — Die spaete Antwort verliert:');

// Nachbau der Nummernvergabe aus fetchFahrten.
function baueAbrufe() {
  const nr = { current: 0 };
  let angezeigt = null;
  const starte = (monat) => {
    const abruf = ++nr.current;
    const ueberholt = () => abruf !== nr.current;
    return {
      monat,
      antworte() {
        if (ueberholt()) return false;
        angezeigt = monat;
        return true;
      },
    };
  };
  return { starte, gezeigt: () => angezeigt };
}

pruefe('der alte Abruf schreibt nicht mehr, wenn ein neuer laeuft', () => {
  const a = baueAbrufe();
  const august = a.starte('2026-08');
  const september = a.starte('2026-09');
  // Der Server antwortet in umgekehrter Reihenfolge — genau der Fall.
  assert.strictEqual(september.antworte(), true);
  assert.strictEqual(august.antworte(), false,
    'die spaete Antwort von August darf September nicht ueberschreiben');
  assert.strictEqual(a.gezeigt(), '2026-09');
});

pruefe('ein einzelner Abruf schreibt normal', () => {
  const a = baueAbrufe();
  const august = a.starte('2026-08');
  assert.strictEqual(august.antworte(), true);
  assert.strictEqual(a.gezeigt(), '2026-08');
});

pruefe('auch bei drei schnellen Wechseln gewinnt der letzte', () => {
  const a = baueAbrufe();
  const eins = a.starte('2026-07');
  const zwei = a.starte('2026-08');
  const drei = a.starte('2026-09');
  assert.strictEqual(zwei.antworte(), false);
  assert.strictEqual(eins.antworte(), false);
  assert.strictEqual(drei.antworte(), true);
  assert.strictEqual(a.gezeigt(), '2026-09');
});

pruefe('ein erneuter Abruf desselben Monats schreibt wieder', () => {
  // Nach dem Speichern wird neu geladen — das darf der Zaehler nicht
  // verschlucken.
  const a = baueAbrufe();
  a.starte('2026-09').antworte();
  const nochmal = a.starte('2026-09');
  assert.strictEqual(nochmal.antworte(), true);
});

console.log('\n' + geprueft + ' Pruefungen bestanden.');
