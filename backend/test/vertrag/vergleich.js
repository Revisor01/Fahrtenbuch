// Vergleicht alt und neu: Status, Inhaltstyp und alte Formen bleiben, neue Felder sind erlaubt. Aufruf: node test/vertrag/vergleich.js <alt.json> <neu.json>

const fs = require('fs');

const [altPfad, neuPfad] = process.argv.slice(2);
const alt = JSON.parse(fs.readFileSync(altPfad, 'utf8'));
const neu = JSON.parse(fs.readFileSync(neuPfad, 'utf8'));

function abweichungen(a, b, ort) {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && a.object && b.object) {
    const liste = [];
    for (const [k, v] of Object.entries(a.object)) {
      if (!(k in b.object)) liste.push(`${ort}.${k}: fehlt`);
      else liste.push(...abweichungen(v, b.object[k], `${ort}.${k}`));
    }
    return liste;
  }
  if (a && b && a.array !== undefined && b.array !== undefined) {
    if (a.array === null) return [];
    if (b.array === null) return [`${ort}[]: leer statt ${JSON.stringify(a.array)}`];
    return abweichungen(a.array, b.array, `${ort}[]`);
  }
  return [`${ort}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`];
}

// Bewusste Wechsel weg von einem 5xx, ausgewiesen statt gezählt, solange die Basis noch 5xx liefert.
const bewusst = JSON.parse(fs.readFileSync(__dirname + '/bewusst.json', 'utf8'));

const fehler = [];
const ausgewiesen = [];
const neuNachSchritt = new Map(neu.map((e) => [e.schritt, e]));
for (const e of alt) {
  const n = neuNachSchritt.get(e.schritt);
  const kennung = `${e.schritt} (${e.methode} ${e.pfad})`;
  if (!n) { fehler.push(`${kennung}: fehlt in neu`); continue; }
  const b = bewusst.find((x) => x.schritt === e.schritt && x.alt === e.status && x.neu === n.status);
  if (b && e.status >= 500) { ausgewiesen.push(`${kennung}: ${e.status} -> ${n.status} (${b.grund})`); continue; }
  if (e.status !== n.status) fehler.push(`${kennung}: Status ${e.status} -> ${n.status}`);
  if (e.typ !== n.typ) fehler.push(`${kennung}: Typ ${e.typ} -> ${n.typ}`);
  if (e.form !== undefined) {
    for (const a of abweichungen(e.form, n.form, 'antwort')) fehler.push(`${kennung}: ${a}`);
  }
}

for (const e of alt) {
  const n = neuNachSchritt.get(e.schritt);
  console.log(`  ${String(e.status).padEnd(4)}${String(n ? n.status : '-').padEnd(4)}${e.schritt}`);
}
if (ausgewiesen.length) {
  console.log(`${ausgewiesen.length} bewusste Aenderungen (bewusst.json):`);
  for (const a of ausgewiesen) console.log('  * ' + a);
}
console.log(`${alt.length} Anfragen verglichen (alt ${alt.length}, neu ${neu.length}).`);
if (fehler.length) {
  console.log(`${fehler.length} Abweichungen:`);
  for (const f of fehler) console.log('  - ' + f);
  process.exit(1);
}
console.log('Keine Abweichung: Status, Inhaltstyp und Antwortformen wie in alt.');
