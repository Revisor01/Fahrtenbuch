// Datumspruefung beim Erfassen und Bearbeiten (24.09.2026).
//
// Befund der Pre-Launch-Pruefung: `datum` wurde nur mit z.string().min(1)
// geprueft — kein Format, kein Bereich. In der Produktionsdatenbank stehen
// dadurch Fahrten mit Jahreszahlen wie 0024, 0206 und 0525 (Tippfehler:
// eine Null zu viel oder Ziffern vertauscht). Sie tauchen in KEINER Monats-,
// Jahres- oder Zeitraumansicht auf und wurden nie abgerechnet — gemessen
// am 24.09.2026: sechs Fahrten (drei Hin-/Rueck-Paare), zwei davon aus den
// letzten fuenf Monaten, ohne korrigierte Zweitfassung.
//
// Die vorhandenen Datensaetze werden bewusst nicht angefasst (Entscheidung
// Simon). Hier geht es nur darum, dass nichts Neues dazukommt.

const assert = require('assert');
const {
  createFahrtSchema,
  updateFahrtSchema,
} = require('../schemas/fahrtSchemas');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

const gueltigeFahrt = {
  datum: '2026-09-24',
  anlass: 'Beerdigung',
  abrechnung: 1,
};

// --- 1. Die echten Fehler aus der Datenbank werden abgewiesen -------------
console.log('\n1 — Genau diese Werte stehen heute in der Datenbank:');

for (const kaputt of ['0024-08-13', '0206-02-24', '0525-05-11', '0026-03-11']) {
  pruefe(`VERBOTEN: ${kaputt}`, () => {
    const ergebnis = createFahrtSchema.safeParse({ ...gueltigeFahrt, datum: kaputt });
    assert.strictEqual(ergebnis.success, false, `${kaputt} muss abgewiesen werden`);
  });
}

// --- 2. Weitere unsinnige Eingaben ----------------------------------------
console.log('\n2 — Auch sonst nur echte Datumsangaben:');

pruefe('VERBOTEN: falsches Format', () => {
  for (const wert of ['24.09.2026', '2026/09/24', 'heute', '2026-9-4', '']) {
    const e = createFahrtSchema.safeParse({ ...gueltigeFahrt, datum: wert });
    assert.strictEqual(e.success, false, `"${wert}" muss abgewiesen werden`);
  }
});

pruefe('VERBOTEN: Tage und Monate, die es nicht gibt', () => {
  for (const wert of ['2026-13-01', '2026-00-10', '2026-02-30', '2026-04-31']) {
    const e = createFahrtSchema.safeParse({ ...gueltigeFahrt, datum: wert });
    assert.strictEqual(e.success, false, `"${wert}" muss abgewiesen werden`);
  }
});

pruefe('VERBOTEN: weit in der Zukunft', () => {
  const inZweiJahren = new Date();
  inZweiJahren.setFullYear(inZweiJahren.getFullYear() + 2);
  const wert = inZweiJahren.toISOString().slice(0, 10);
  const e = createFahrtSchema.safeParse({ ...gueltigeFahrt, datum: wert });
  assert.strictEqual(e.success, false, 'Fahrten zwei Jahre voraus sind ein Tippfehler');
});

// --- 3. Was weiterhin erlaubt sein MUSS -----------------------------------
// Wichtiger als die Abweisung: Niemand darf beim Nachtragen ausgesperrt
// werden. Das Fahrtenbuch wird oft rueckwirkend gefuehrt.
console.log('\n3 — Nachtragen bleibt moeglich:');

pruefe('ERLAUBT: heute', () => {
  const heute = new Date().toISOString().slice(0, 10);
  const e = createFahrtSchema.safeParse({ ...gueltigeFahrt, datum: heute });
  assert.strictEqual(e.success, true, e.error?.issues?.[0]?.message);
});

pruefe('ERLAUBT: Schaltjahrtag', () => {
  const e = createFahrtSchema.safeParse({ ...gueltigeFahrt, datum: '2024-02-29' });
  assert.strictEqual(e.success, true);
});

pruefe('ERLAUBT: mehrere Jahre zurueck (Nachtrag alter Abrechnungen)', () => {
  const e = createFahrtSchema.safeParse({ ...gueltigeFahrt, datum: '2021-03-15' });
  assert.strictEqual(e.success, true, e.error?.issues?.[0]?.message);
});

pruefe('ERLAUBT: naechster Monat (geplante Fahrt)', () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  const e = createFahrtSchema.safeParse({ ...gueltigeFahrt, datum: d.toISOString().slice(0, 10) });
  assert.strictEqual(e.success, true, e.error?.issues?.[0]?.message);
});

// --- 4. Bearbeiten pruefte bisher genauso lasch ---------------------------
console.log('\n4 — Beim Bearbeiten gilt dasselbe:');

pruefe('VERBOTEN: 0206-02-24 auch beim Aendern', () => {
  const e = updateFahrtSchema.safeParse({ ...gueltigeFahrt, datum: '0206-02-24' });
  assert.strictEqual(e.success, false);
});

pruefe('ERLAUBT: gueltiges Datum beim Aendern', () => {
  const e = updateFahrtSchema.safeParse({ ...gueltigeFahrt, datum: '2026-08-01' });
  assert.strictEqual(e.success, true, e.error?.issues?.[0]?.message);
});

// --- 5. Die Meldung muss verstaendlich sein -------------------------------
console.log('\n5 — Verstaendliche Rueckmeldung:');

pruefe('die Fehlermeldung nennt das Problem auf Deutsch', () => {
  const e = createFahrtSchema.safeParse({ ...gueltigeFahrt, datum: '0024-08-13' });
  const text = e.error?.issues?.[0]?.message || '';
  assert.ok(/[Dd]atum/.test(text), `Meldung "${text}" sollte das Datum benennen`);
  assert.ok(!/invalid|expected/i.test(text), `Meldung "${text}" ist nicht auf Deutsch`);
});

console.log('\n' + geprueft + ' Pruefungen bestanden.\n');
