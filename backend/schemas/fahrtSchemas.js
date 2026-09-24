const { z } = require('zod');

// Spiegelt das DB-Enum mitfahrer.richtung ENUM('hin','rueck','hin_rueck').
// Ohne diese Pruefung schlug ein ungueltiger Wert erst als DB-Fehler durch —
// der Nutzer sah einen 500er statt einer Meldung. Leer/fehlend gilt als 'hin',
// wie es das Formular vorbelegt.
const richtungSchema = z
  .enum(['hin', 'rueck', 'hin_rueck'], {
    error: 'Richtung muss hin, rueck oder hin_rueck sein',
  })
  .nullish()
  .transform((wert) => wert ?? 'hin');

// Optionale Verweise auf andere Datensaetze (Orte, Partnerfahrt). Dieselbe
// Falle wie bei den Kilometern: Der iOS-Kurzbefehl sendet diese Felder immer
// mit — bei einem manuell eingegebenen Ort steht dort leerer Text. `z.coerce`
// machte daraus die Zahl 0, `positive()` wies sie ab, und die Fahrt scheiterte
// mit „vonOrtId too small" (Simon 24.08.). Leer/0 heisst hier „nicht gesetzt"
// und wird zu null — der Controller nutzt dann den Freitext-Ort.
// `abrechnung` bleibt bewusst streng: ein Abrechnungstraeger ist Pflicht.
const optionaleIdSchema = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .optional()
  .nullable()
  .transform((wert) => {
    if (wert === null || wert === undefined) return null;
    if (typeof wert === 'string' && wert.trim() === '') return null;
    const zahl = Number(wert);
    if (!Number.isInteger(zahl)) return NaN; // faellt unten durch die Pruefung
    return zahl === 0 ? null : zahl;
  })
  .refine((wert) => wert === null || (Number.isInteger(wert) && wert > 0), {
    error: 'Muss eine positive ganze Zahl sein',
  });

// Kilometer sind optional: Wer zwei gespeicherte Orte waehlt, ueberlaesst die
// Strecke der hinterlegten Distanz — der Controller rechnet sie dann selbst
// aus. Frueher stand hier `z.coerce.number().positive()`, und das wies genau
// diesen Fall ab: Der iOS-Kurzbefehl sendet das Feld immer mit, bei zwei
// gespeicherten Orten als leeren Text. `z.coerce` macht daraus die Zahl 0,
// `positive()` lehnte sie ab — die Fahrt scheiterte mit „Kilometer falsch",
// obwohl die Distanz hinterlegt war (Simon 23.08.).
// Leer, 0 und null bedeuten jetzt einheitlich „nicht angegeben" → null, und
// erst dadurch greift die Berechnung im Controller. Echte Werte bleiben
// unveraendert, negative werden weiterhin abgewiesen.
const kilometerSchema = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .optional()
  .nullable()
  .transform((wert) => {
    if (wert === null || wert === undefined) return null;
    if (typeof wert === 'string' && wert.trim() === '') return null;
    const zahl = Number(wert);
    if (!Number.isFinite(zahl)) return NaN; // faellt unten durch die Pruefung
    return zahl === 0 ? null : zahl;
  })
  .refine((wert) => wert === null || (Number.isFinite(wert) && wert > 0), {
    error: 'Kilometer muss eine positive Zahl sein',
  });

// Datum einer Fahrt: Format, Gueltigkeit und ein plausibler Bereich.
//
// Bisher genuegte z.string().min(1). In der Produktionsdatenbank stehen
// dadurch Fahrten mit den Jahren 0024, 0206, 0525 und 0026 — Tippfehler beim
// Eintippen. Sie tauchen in keiner Monats-, Jahres- oder Zeitraumansicht auf
// und wurden nie abgerechnet; die Nutzer haben es nie bemerkt, weil die
// Fahrt scheinbar gespeichert war.
//
// Der Bereich ist bewusst weit: Das Fahrtenbuch wird oft rueckwirkend
// gefuehrt, und geplante Fahrten im naechsten Monat sind normal. Abgewiesen
// wird nur, was ein Vertipper sein muss.
const JAHR_FRUEHESTENS = 2015;

const datumSchema = z
  .string()
  .min(1, 'Datum ist erforderlich')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss im Format JJJJ-MM-TT angegeben werden')
  .refine((wert) => {
    // new Date('2026-02-30') ergibt den 2. Maerz — der Rueckvergleich faengt
    // solche Kalendersprünge ab.
    const d = new Date(`${wert}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === wert;
  }, 'Dieses Datum gibt es nicht')
  .refine((wert) => Number(wert.slice(0, 4)) >= JAHR_FRUEHESTENS, {
    error: `Das Datum liegt zu weit zurück (frühestens ${JAHR_FRUEHESTENS})`,
  })
  .refine((wert) => {
    // Ein Jahr Vorlauf reicht fuer geplante Fahrten; alles darueber ist ein
    // Zahlendreher im Jahr.
    const grenze = new Date();
    grenze.setFullYear(grenze.getFullYear() + 1);
    return new Date(`${wert}T00:00:00Z`) <= grenze;
  }, 'Das Datum liegt zu weit in der Zukunft');

const createFahrtSchema = z.object({
  vonOrtId: optionaleIdSchema,
  nachOrtId: optionaleIdSchema,
  datum: datumSchema,
  anlass: z.string().min(1, 'Anlass ist erforderlich'),
  kilometer: kilometerSchema,
  abrechnung: z.coerce.number().int().positive('Abrechnungstraeger ist erforderlich'),
  einmaligerVonOrt: z.string().optional().nullable(),
  einmaligerNachOrt: z.string().optional().nullable(),
  // Gegenfahrt desselben Hin-und-Rueck-Paares. Ohne Eintrag hier wuerde
  // validate() das Feld aus dem Body entfernen, bevor der Controller es sieht.
  partnerFahrtId: optionaleIdSchema,
  mitfahrer: z.array(z.object({
    name: z.string().min(1, 'Mitfahrer-Name ist erforderlich'),
    arbeitsstaette: z.string().optional().nullable(),
    richtung: richtungSchema,
  })).optional(),
});

const updateFahrtSchema = z.object({
  vonOrtId: optionaleIdSchema,
  nachOrtId: optionaleIdSchema,
  datum: datumSchema,
  anlass: z.string().min(1, 'Anlass ist erforderlich'),
  kilometer: kilometerSchema,
  abrechnung: z.coerce.number().int().positive('Abrechnungstraeger ist erforderlich'),
  einmaligerVonOrt: z.string().optional().nullable(),
  einmaligerNachOrt: z.string().optional().nullable(),
  mitfahrer: z.array(z.object({
    id: z.coerce.number().int().positive().optional(),
    name: z.string().min(1, 'Mitfahrer-Name ist erforderlich'),
    arbeitsstaette: z.string().optional().nullable(),
    richtung: richtungSchema,
  })).optional(),
});

const addMitfahrerSchema = z.object({
  name: z.string().min(1, 'Mitfahrer-Name ist erforderlich'),
  arbeitsstaette: z.string().optional().nullable(),
  richtung: richtungSchema,
});

const updateMitfahrerSchema = z.object({
  name: z.string().min(1, 'Mitfahrer-Name ist erforderlich'),
  arbeitsstaette: z.string().optional().nullable(),
  richtung: richtungSchema,
});

const abrechnungsStatusSchema = z.object({
  jahr: z.coerce.number().int().positive(),
  monat: z.coerce.number().int().min(1).max(12),
  typ: z.union([z.string().min(1), z.number()]).transform(String),
  aktion: z.string().min(1),
  datum: z.string().optional().nullable(),
});

// --- Zeitraum-Parameter der Export- und Report-Routen ---------------------
//
// Die Zeitraum-Routen liefen ohne jede Pruefung in eine Monatsschleife:
// `GET /api/fahrten/report-range/1/1/9999/12` ergab 120.000 Monatsabfragen
// nacheinander bei 10 Pool-Verbindungen; ueber den Export-Weg zusaetzlich
// 120.000 Zeilen in `abrechnungen`. Jeder Angemeldete konnte damit den
// Server lahmlegen.
//
// MAX_MONATE begrenzt die Spanne. Die Grenze liegt bewusst hoch: Die
// Jahresauswahl der Oberflaeche (ZeitraumSegmente.js, JAHRE = 2024..2029)
// laesst bis zu 72 Monate zu, und eine engere Grenze haette genau die
// Kombinationen abgewiesen, die dort waehlbar sind — auch in den bereits
// ausgelieferten Apps, die sich nicht mitdeployen lassen.
//
// Teuer ist die Spanne ohnehin nicht linear: Der Export holt die Fahrten in
// EINER Abfrage (getDateRangeReport); pro Monat laeuft nur ein Status-UPDATE
// bzw. im Report eine Status-Abfrage. 120 Monate sind damit eine Groessen-
// ordnung, die der Pool vertraegt, waehrend das eigentliche Problem — das
// unbegrenzte `9999` mit 120.000 Monatsdurchlaeufen — sicher abgewiesen wird.
const MAX_MONATE = 120;

const jahrZahlSchema = z.coerce
  .number({ error: 'Jahr muss eine Zahl sein' })
  .int('Jahr muss eine ganze Zahl sein')
  .min(2000, 'Jahr muss zwischen 2000 und 2100 liegen')
  .max(2100, 'Jahr muss zwischen 2000 und 2100 liegen');

// Wie beim Monat: als String zurueck, damit sich an dem, was die Handler
// sehen, nichts aendert.
const jahrSchema = jahrZahlSchema.transform((j) => String(j));

const monatZahlSchema = z.coerce
  .number({ error: 'Monat muss eine Zahl sein' })
  .int('Monat muss eine ganze Zahl sein')
  .min(1, 'Monat muss zwischen 1 und 12 liegen')
  .max(12, 'Monat muss zwischen 1 und 12 liegen');

// Nach aussen bleibt der Monat ein nullgepolsterter String — genau das, was
// bisher aus dem Pfad kam. Die Handler rufen darauf `.split('-')` auf und
// bauen daraus Dateinamen (`..._2026_08`); eine Zahl haette dort einen 500er
// ausgeloest und den Dateinamen zu `_8` verkuerzt.
const monatSchema = monatZahlSchema.transform((m) => String(m).padStart(2, '0'));

// Abrechnungstraeger-ID oder die Sonderkategorie `mitfahrer`. Das Frontend
// schickt den Wert kleingeschrieben (`key.toLowerCase()`).
const exportTypSchema = z
  .string()
  .regex(/^(\d+|mitfahrer)$/, 'Typ muss eine Abrechnungstraeger-ID oder "mitfahrer" sein');

// Der Einzelmonats-Export nimmt seit jeher auch „2026-08" als Monat an
// (baueMonatsWorkbooks: `month.split('-')[1] || month`), und die
// API-Dokumentation nennt dieses Format ausdruecklich. Es bleibt gueltig —
// ein Client, der es nutzt, laesst sich nicht mitdeployen.
const monatMitJahrSchema = z
  .union([z.string(), z.number()])
  .transform((wert) => String(wert))
  .transform((wert) => (wert.includes('-') ? wert.split('-')[1] : wert))
  .pipe(monatSchema);


const monatsParamsSchema = z.object({
  year: jahrSchema,
  month: monatMitJahrSchema,
});

const monatsExportParamsSchema = monatsParamsSchema.extend({
  type: exportTypSchema,
});

// Spanne in Monaten, Endpunkte eingeschlossen: Januar–Januar = 1 Monat.
// Die Params sind hier bereits Strings ('2026', '08') — fuer die Rechnung
// zurueck in Zahlen. Number('08') ist 8, nicht oktal.
const spanneInMonaten = ({ startYear, startMonth, endYear, endMonth }) =>
  (Number(endYear) - Number(startYear)) * 12 +
  (Number(endMonth) - Number(startMonth)) + 1;

const zeitraumRegeln = (schema) =>
  schema
    .refine((p) => spanneInMonaten(p) >= 1, {
      error: 'Der Zeitraum darf nicht rueckwaerts laufen',
    })
    .refine((p) => spanneInMonaten(p) <= MAX_MONATE, {
      error: `Der Zeitraum darf hoechstens ${MAX_MONATE} Monate umfassen`,
    });

const zeitraumParamsSchema = zeitraumRegeln(
  z.object({
    startYear: jahrSchema,
    startMonth: monatSchema,
    endYear: jahrSchema,
    endMonth: monatSchema,
  })
);

const zeitraumExportParamsSchema = zeitraumRegeln(
  z.object({
    type: exportTypSchema,
    startYear: jahrSchema,
    startMonth: monatSchema,
    endYear: jahrSchema,
    endMonth: monatSchema,
  })
);

module.exports = {
  createFahrtSchema,
  updateFahrtSchema,
  addMitfahrerSchema,
  updateMitfahrerSchema,
  abrechnungsStatusSchema,
  monatsParamsSchema,
  monatsExportParamsSchema,
  zeitraumParamsSchema,
  zeitraumExportParamsSchema,
  MAX_MONATE,
};
