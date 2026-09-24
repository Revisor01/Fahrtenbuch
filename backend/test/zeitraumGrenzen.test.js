// Punkt 2 der Pre-Launch-Liste: Die Zeitraum-Routen nahmen jeden Pfad an.
//
// `GET /api/fahrten/report-range/1/1/9999/12` lief in eine Monatsschleife mit
// 120.000 Durchlaeufen bei 10 Pool-Verbindungen; ueber den Export-Weg legte
// dieselbe Schleife zusaetzlich 120.000 Zeilen in `abrechnungen` an. Jeder
// Angemeldete konnte den Server damit lahmlegen. Die Routen hatten kein
// `validate`, und `fahrtSchemas.js` kannte keine Params.
//
// Geprueft wird der verbotene UND der erlaubte Fall. Der erlaubte ist hier
// der wichtigere: Die Jahresauswahl der Oberflaeche laesst bis zu 72 Monate
// zu (JAHRE = 2024..2029), und die ausgelieferten Apps lassen sich nicht
// mitdeployen — eine zu enge Grenze haette sie gebrochen.
//
// Laeuft ohne Test-Framework: `node test/zeitraumGrenzen.test.js`.

const assert = require('assert');
const fs = require('fs');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

const {
  monatsParamsSchema,
  monatsExportParamsSchema,
  zeitraumParamsSchema,
  zeitraumExportParamsSchema,
  MAX_MONATE,
} = require('../schemas/fahrtSchemas');

const gueltig = (schema, werte) => schema.safeParse(werte).success;
const fehler = (schema, werte) => {
  const e = schema.safeParse(werte);
  return e.success ? null : e.error.issues.map((i) => i.message).join(' | ');
};

// --- 1. Der Angriffsfall wird abgewiesen ----------------------------------
console.log('\n1 — Der DoS-Pfad ist zu:');

pruefe('report-range/1/1/9999/12 wird abgewiesen', () => {
  assert.ok(!gueltig(zeitraumParamsSchema, {
    startYear: '1', startMonth: '1', endYear: '9999', endMonth: '12',
  }), 'genau dieser Pfad ergab 120.000 Monatsdurchlaeufe');
});

pruefe('ein Jahr unter 2000 wird abgewiesen', () => {
  assert.ok(!gueltig(zeitraumParamsSchema, {
    startYear: '1', startMonth: '1', endYear: '2026', endMonth: '12',
  }));
});

pruefe('ein Jahr ueber 2100 wird abgewiesen', () => {
  assert.ok(!gueltig(zeitraumParamsSchema, {
    startYear: '2026', startMonth: '1', endYear: '9999', endMonth: '12',
  }));
});

pruefe('ein Monat ausserhalb 1..12 wird abgewiesen', () => {
  assert.ok(!gueltig(zeitraumParamsSchema, {
    startYear: '2026', startMonth: '0', endYear: '2026', endMonth: '12',
  }), 'Monat 0');
  assert.ok(!gueltig(zeitraumParamsSchema, {
    startYear: '2026', startMonth: '1', endYear: '2026', endMonth: '13',
  }), 'Monat 13');
});

pruefe('Text statt Zahl wird abgewiesen', () => {
  assert.ok(!gueltig(zeitraumParamsSchema, {
    startYear: 'abc', startMonth: '1', endYear: '2026', endMonth: '12',
  }));
});

pruefe('ein rueckwaerts laufender Zeitraum wird abgewiesen', () => {
  assert.ok(!gueltig(zeitraumParamsSchema, {
    startYear: '2026', startMonth: '6', endYear: '2026', endMonth: '3',
  }), 'Bis vor Von');
  assert.ok(!gueltig(zeitraumParamsSchema, {
    startYear: '2027', startMonth: '1', endYear: '2026', endMonth: '1',
  }), 'Bis-Jahr vor Von-Jahr');
});

pruefe('die Spanne ist auf MAX_MONATE begrenzt', () => {
  const zuLang = MAX_MONATE + 1;
  const endJahr = 2026 + Math.floor((zuLang - 1) / 12);
  const endMonat = ((zuLang - 1) % 12) + 1;
  assert.ok(!gueltig(zeitraumParamsSchema, {
    startYear: '2026', startMonth: '1', endYear: String(endJahr), endMonth: String(endMonat),
  }), `${zuLang} Monate muessen abgewiesen werden`);
});

// --- 2. Der erlaubte Fall geht weiterhin ----------------------------------
// Der wichtigere Teil: Was die Oberflaeche zulaesst, muss durchkommen — auch
// aus den bereits ausgelieferten Apps.
console.log('\n2 — Was die App schickt, kommt durch:');

pruefe('ein einzelner Monat geht', () => {
  assert.strictEqual(fehler(zeitraumParamsSchema, {
    startYear: '2026', startMonth: '9', endYear: '2026', endMonth: '9',
  }), null);
});

pruefe('ein normaler Zeitraum ueber den Jahreswechsel geht', () => {
  assert.strictEqual(fehler(zeitraumParamsSchema, {
    startYear: '2025', startMonth: '11', endYear: '2026', endMonth: '2',
  }), null);
});

pruefe('die weiteste in der Oberflaeche waehlbare Spanne geht (2024-01..2029-12)', () => {
  // ZeitraumSegmente.js: JAHRE = [...Array(6)].map((_, i) => 2024 + i)
  // Januar 2024 bis Dezember 2029 = 72 Monate. Genau das muss durchkommen.
  assert.strictEqual(fehler(zeitraumParamsSchema, {
    startYear: '2024', startMonth: '1', endYear: '2029', endMonth: '12',
  }), null, 'sonst bricht der Export in den ausgelieferten Apps');
});

pruefe('MAX_MONATE deckt die Oberflaechen-Auswahl mit Reserve ab', () => {
  assert.ok(MAX_MONATE >= 72,
    `MAX_MONATE=${MAX_MONATE} liegt unter den 72 Monaten, die die Oberflaeche zulaesst`);
});

pruefe('fuehrende Nullen aus padStart werden akzeptiert', () => {
  // Das Frontend baut den Pfad mit month.padStart(2, '0') — „09" statt „9".
  assert.strictEqual(fehler(zeitraumParamsSchema, {
    startYear: '2026', startMonth: '01', endYear: '2026', endMonth: '09',
  }), null);
});

pruefe('geprueste Werte bleiben Strings im bisherigen Format', () => {
  // Die Handler rufen auf dem Monat `.split('-')` auf und bauen daraus
  // Dateinamen. Eine Zahl loeste dort einen 500er aus und verkuerzte den
  // Namen zu `_8` — beides waere ein Bruch fuer ausgelieferte Apps.
  const p = zeitraumParamsSchema.parse({
    startYear: '2026', startMonth: '1', endYear: '2026', endMonth: '03',
  });
  assert.strictEqual(p.startYear, '2026');
  assert.strictEqual(p.startMonth, '01', 'Monat bleibt nullgepolstert');
  assert.strictEqual(typeof p.endMonth, 'string');
});

pruefe('der Einzelmonat nimmt weiterhin „2026-08" an (dokumentiertes Format)', () => {
  // baueMonatsWorkbooks: `month.split('-')[1] || month`; die API-Doku nennt
  // dieses Format ausdruecklich. Ein Client, der es nutzt (API-Key, aeltere
  // App), laesst sich nicht mitdeployen.
  const p = monatsParamsSchema.safeParse({ year: '2026', month: '2026-08' });
  assert.ok(p.success, 'das dokumentierte Format muss gueltig bleiben');
  assert.strictEqual(p.data.month, '08');
});

pruefe('der Handler-Pfad crasht nicht und liefert denselben Dateinamen', () => {
  for (const eingabe of ['08', '8', '2026-08']) {
    const p = monatsExportParamsSchema.parse({ type: '1', year: '2026', month: eingabe });
    // exakt die Zeile aus baueMonatsWorkbooks
    const corrected = p.month.split('-')[1] || p.month;
    assert.strictEqual(`fahrtenabrechnung_1_${p.year}_${corrected}`,
      'fahrtenabrechnung_1_2026_08',
      `Eingabe ${eingabe} aenderte den Dateinamen`);
  }
});

// --- 3. Der Export-Typ ----------------------------------------------------
console.log('\n3 — Export-Typ:');

pruefe('eine Traeger-ID geht', () => {
  assert.strictEqual(fehler(zeitraumExportParamsSchema, {
    type: '7', startYear: '2026', startMonth: '1', endYear: '2026', endMonth: '3',
  }), null);
});

pruefe('„mitfahrer" geht', () => {
  assert.strictEqual(fehler(zeitraumExportParamsSchema, {
    type: 'mitfahrer', startYear: '2026', startMonth: '1', endYear: '2026', endMonth: '3',
  }), null);
});

pruefe('ein erfundener Typ wird abgewiesen', () => {
  assert.ok(!gueltig(zeitraumExportParamsSchema, {
    type: '../../etc/passwd', startYear: '2026', startMonth: '1', endYear: '2026', endMonth: '3',
  }));
  assert.ok(!gueltig(zeitraumExportParamsSchema, {
    type: 'alle', startYear: '2026', startMonth: '1', endYear: '2026', endMonth: '3',
  }));
});

// --- 4. Monats-Routen -----------------------------------------------------
console.log('\n4 — Einzelmonat-Routen:');

pruefe('report/:year/:month prueft Jahr und Monat', () => {
  assert.strictEqual(fehler(monatsParamsSchema, { year: '2026', month: '09' }), null);
  assert.ok(!gueltig(monatsParamsSchema, { year: '9999', month: '9' }));
  assert.ok(!gueltig(monatsParamsSchema, { year: '2026', month: '13' }));
});

pruefe('export/:type/:year/:month prueft zusaetzlich den Typ', () => {
  assert.strictEqual(fehler(monatsExportParamsSchema,
    { type: 'mitfahrer', year: '2026', month: '9' }), null);
  assert.ok(!gueltig(monatsExportParamsSchema, { type: 'x', year: '2026', month: '9' }));
});

// --- 5. Die Routen nutzen die Schemas auch ---------------------------------
// Ein Schema, das nirgends haengt, schuetzt nichts.
console.log('\n5 — Verdrahtung:');

const routen = fs.readFileSync(__dirname + '/../routes/fahrten.js', 'utf8');

pruefe('validateParams ist importiert', () => {
  assert.ok(/validateParams/.test(routen) && /require\('\.\.\/middleware\/validate'\)/.test(routen));
});

for (const [pfad, schema] of [
  ['/export/:type/:year/:month', 'monatsExportParamsSchema'],
  ['/export-range/:type/:startYear/:startMonth/:endYear/:endMonth', 'zeitraumExportParamsSchema'],
  ['/export-pdf/:type/:year/:month', 'monatsExportParamsSchema'],
  ['/export-pdf-range/:type/:startYear/:startMonth/:endYear/:endMonth', 'zeitraumExportParamsSchema'],
  ['/report/:year/:month', 'monatsParamsSchema'],
  ['/report-range/:startYear/:startMonth/:endYear/:endMonth', 'zeitraumParamsSchema'],
]) {
  pruefe(`${pfad} prueft mit ${schema}`, () => {
    const zeile = routen.split('\n').find((z) => z.includes(`'${pfad}'`));
    assert.ok(zeile, `Route ${pfad} nicht gefunden`);
    assert.ok(zeile.includes(`validateParams(${schema})`),
      `Route ${pfad} laeuft ungeprueft in die Monatsschleife`);
  });
}

// --- 6. Die Middleware selbst ---------------------------------------------
console.log('\n6 — validateParams:');

const { validateParams } = require('../middleware/validate');

pruefe('gueltige Params werden durchgereicht und ersetzt', () => {
  const req = { params: { year: '2026', month: '09' } };
  let weiter = false;
  validateParams(monatsParamsSchema)(req, {}, () => { weiter = true; });
  assert.ok(weiter, 'next() muss laufen');
  assert.strictEqual(req.params.year, '2026', 'der geprueste Wert muss zurueckgeschrieben sein');
  assert.strictEqual(req.params.month, '09', 'und im bisherigen Format bleiben');
});

pruefe('ungueltige Params ergeben 400 mit Feldnamen', () => {
  const req = { params: { year: '9999', month: '9' } };
  let status = null;
  let koerper = null;
  const res = {
    status(c) { status = c; return this; },
    json(k) { koerper = k; return this; },
  };
  let weiter = false;
  validateParams(monatsParamsSchema)(req, res, () => { weiter = true; });
  assert.strictEqual(status, 400);
  assert.strictEqual(weiter, false, 'der Handler darf nicht laufen');
  assert.strictEqual(koerper.message, 'Validierungsfehler');
  assert.ok(koerper.errors.some((e) => e.field === 'year'), 'das Feld muss benannt sein');
});

console.log('\n' + geprueft + ' Pruefungen bestanden.');
