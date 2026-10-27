// Vergleicht zwei Protokolle aus anfragefolge.js: alt (Basis-Branch) und neu.
// Gleich bleiben muessen Status, Inhaltstyp und jede Form, die alt lieferte.
// Neue Felder sind erlaubt, wegfallende oder anders getypte nicht: die Apps
// im Store lesen die alte Form.
//
// Aufruf: node test/vertrag/vergleich.js <alt.json> <neu.json>

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

const fehler = [];
const neuNachSchritt = new Map(neu.map((e) => [e.schritt, e]));
for (const e of alt) {
  const n = neuNachSchritt.get(e.schritt);
  const kennung = `${e.schritt} (${e.methode} ${e.pfad})`;
  if (!n) { fehler.push(`${kennung}: fehlt in neu`); continue; }
  if (e.status !== n.status) fehler.push(`${kennung}: Status ${e.status} -> ${n.status}`);
  if (e.typ !== n.typ) fehler.push(`${kennung}: Typ ${e.typ} -> ${n.typ}`);
  if (e.form !== undefined) {
    for (const a of abweichungen(e.form, n.form, 'antwort')) fehler.push(`${kennung}: ${a}`);
  }
}

console.log(`${alt.length} Anfragen verglichen (alt ${alt.length}, neu ${neu.length}).`);
if (fehler.length) {
  console.log(`${fehler.length} Abweichungen:`);
  for (const f of fehler) console.log('  - ' + f);
  process.exit(1);
}
console.log('Keine Abweichung: Status, Inhaltstyp und Antwortformen wie in alt.');
