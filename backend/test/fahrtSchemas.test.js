// Regressionstest zum Kurzbefehl-Fehler vom 23.08.: Der iOS-Kurzbefehl sendet
// `kilometer` immer mit — bei zwei gespeicherten Orten als leeren Text. Das
// alte `z.coerce.number().positive()` machte daraus die Zahl 0 und wies sie ab,
// die Fahrt scheiterte mit einem Validierungsfehler, obwohl die Distanz
// hinterlegt war. Leer/0 muss zu null werden, damit der Controller rechnet.
//
// Laeuft ohne Test-Framework: `node test/fahrtSchemas.test.js`.

const assert = require('assert');
const { createFahrtSchema, updateFahrtSchema } = require('../schemas/fahrtSchemas');

const basis = {
  datum: '2026-08-23',
  anlass: 'Konzert',
  abrechnung: 1,
  vonOrtId: 7,
  nachOrtId: 8,
};

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

function parse(schema, kilometer) {
  const body = { ...basis };
  if (kilometer !== 'WEGGELASSEN') body.kilometer = kilometer;
  return schema.safeParse(body);
}

for (const [name, schema] of [['createFahrtSchema', createFahrtSchema], ['updateFahrtSchema', updateFahrtSchema]]) {
  console.log('\n' + name + ':');

  // --- Der Fall, der den Fehler ausgeloest hat ---
  pruefe('leerer Text wird zu null (Kurzbefehl, zwei gespeicherte Orte)', () => {
    const r = parse(schema, '');
    assert.strictEqual(r.success, true, 'leerer Text muss durchgehen');
    assert.strictEqual(r.data.kilometer, null, 'leerer Text muss zu null werden');
  });

  pruefe('Leerzeichen werden zu null', () => {
    const r = parse(schema, '   ');
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.data.kilometer, null);
  });

  pruefe('Text "0" wird zu null', () => {
    const r = parse(schema, '0');
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.data.kilometer, null);
  });

  pruefe('Zahl 0 wird zu null', () => {
    const r = parse(schema, 0);
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.data.kilometer, null);
  });

  pruefe('weggelassen ergibt null', () => {
    const r = parse(schema, 'WEGGELASSEN');
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.data.kilometer, null);
  });

  pruefe('null bleibt null', () => {
    const r = parse(schema, null);
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.data.kilometer, null);
  });

  // --- Echte Werte bleiben unveraendert ---
  pruefe('Zahl 32 bleibt 32', () => {
    const r = parse(schema, 32);
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.data.kilometer, 32);
  });

  pruefe('Text "32" wird zur Zahl 32', () => {
    const r = parse(schema, '32');
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.data.kilometer, 32);
  });

  pruefe('Dezimalwert "12.5" bleibt erhalten', () => {
    const r = parse(schema, '12.5');
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.data.kilometer, 12.5);
  });

  // --- Ungueltiges wird weiterhin abgewiesen ---
  pruefe('negativer Wert wird abgewiesen', () => {
    const r = parse(schema, -5);
    assert.strictEqual(r.success, false, 'negativ muss scheitern');
  });

  pruefe('nicht-numerischer Text wird abgewiesen', () => {
    const r = parse(schema, 'abc');
    assert.strictEqual(r.success, false, 'Unsinn muss scheitern');
  });
}

// --- Ort-IDs: dieselbe Falle wie bei den Kilometern (24.08.) -------------
// Der Kurzbefehl sendet vonOrtId/nachOrtId immer mit; bei manuell
// eingegebenem Ort als leeren Text. Vorher: 400 "vonOrtId too small".
console.log('\nOrt-IDs und Partnerverweis:');

function parseMitOrten(schema, felder) {
  return schema.safeParse({
    datum: '2026-08-23',
    anlass: 'Konzert',
    abrechnung: 1,
    ...felder,
  });
}

for (const [name, schema] of [['createFahrtSchema', createFahrtSchema], ['updateFahrtSchema', updateFahrtSchema]]) {
  pruefe(name + ': leerer Von-Ort mit Freitext wird zu null', () => {
    const r = parseMitOrten(schema, { vonOrtId: '', nachOrtId: '8', einmaligerVonOrt: 'Heide' });
    assert.strictEqual(r.success, true, 'leerer Text muss durchgehen');
    assert.strictEqual(r.data.vonOrtId, null);
    assert.strictEqual(r.data.nachOrtId, 8);
  });

  pruefe(name + ': beide Orte als Freitext ergeben null', () => {
    const r = parseMitOrten(schema, { vonOrtId: '', nachOrtId: '', einmaligerVonOrt: 'A', einmaligerNachOrt: 'B' });
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.data.vonOrtId, null);
    assert.strictEqual(r.data.nachOrtId, null);
  });

  pruefe(name + ': echte Ort-IDs bleiben erhalten', () => {
    const r = parseMitOrten(schema, { vonOrtId: '7', nachOrtId: 8 });
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.data.vonOrtId, 7);
    assert.strictEqual(r.data.nachOrtId, 8);
  });

  pruefe(name + ': negative Ort-ID wird abgewiesen', () => {
    const r = parseMitOrten(schema, { vonOrtId: -3 });
    assert.strictEqual(r.success, false);
  });

  pruefe(name + ': nicht-ganzzahlige Ort-ID wird abgewiesen', () => {
    const r = parseMitOrten(schema, { vonOrtId: '7.5' });
    assert.strictEqual(r.success, false);
  });
}

// partnerFahrtId gibt es nur beim Anlegen — der Kurzbefehl verknuepft damit
// Hin- und Rueckfahrt. Leer bedeutet: keine Gegenfahrt.
pruefe('createFahrtSchema: leere partnerFahrtId wird zu null', () => {
  const r = parseMitOrten(createFahrtSchema, { vonOrtId: 7, nachOrtId: 8, partnerFahrtId: '' });
  assert.strictEqual(r.success, true);
  assert.strictEqual(r.data.partnerFahrtId, null);
});

pruefe('createFahrtSchema: echte partnerFahrtId bleibt erhalten', () => {
  const r = parseMitOrten(createFahrtSchema, { vonOrtId: 8, nachOrtId: 7, partnerFahrtId: '2830' });
  assert.strictEqual(r.success, true);
  assert.strictEqual(r.data.partnerFahrtId, 2830);
});

// Der Abrechnungstraeger bleibt Pflicht — hier darf 0/leer NICHT durchgehen.
pruefe('createFahrtSchema: leerer Abrechnungstraeger wird abgewiesen', () => {
  const r = createFahrtSchema.safeParse({ datum: '2026-08-23', anlass: 'X', abrechnung: '' });
  assert.strictEqual(r.success, false, 'Abrechnungstraeger muss Pflicht bleiben');
});

console.log('\n' + geprueft + ' Pruefungen bestanden.');
