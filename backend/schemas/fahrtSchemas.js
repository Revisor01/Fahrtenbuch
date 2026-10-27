const { z } = require('zod');

// Wie das DB-Enum mitfahrer.richtung, leer gilt als 'hin'.
const richtungSchema = z
  .enum(['hin', 'rueck', 'hin_rueck'], {
    error: 'Richtung muss hin, rueck oder hin_rueck sein',
  })
  .nullish()
  .transform((wert) => wert ?? 'hin');

// Leer oder 0 wird null, weil der iOS-Kurzbefehl die Felder immer schickt; `abrechnung` bleibt Pflicht.
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

// Leer, 0 und null heißen „nicht angegeben“, dann rechnet der Controller die hinterlegte Distanz; negative bleiben verboten.
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

// Datum mit Format, Gültigkeit und weitem Bereich, abgewiesen wird nur ein sicherer Vertipper.
const JAHR_FRUEHESTENS = 2015;

const datumSchema = z
  .string()
  .min(1, 'Datum ist erforderlich')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss im Format JJJJ-MM-TT angegeben werden')
  .refine((wert) => {
    // Fängt Kalendersprünge wie den 30.2. ab.
    const d = new Date(`${wert}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === wert;
  }, 'Dieses Datum gibt es nicht')
  .refine((wert) => Number(wert.slice(0, 4)) >= JAHR_FRUEHESTENS, {
    error: `Das Datum liegt zu weit zurück (frühestens ${JAHR_FRUEHESTENS})`,
  })
  .refine((wert) => {
    // Ein Jahr Vorlauf, darüber ist es ein Zahlendreher.
    const grenze = new Date();
    grenze.setFullYear(grenze.getFullYear() + 1);
    return new Date(`${wert}T00:00:00Z`) <= grenze;
  }, 'Das Datum liegt zu weit in der Zukunft');

// Die Spalte ist NOT NULL; die Apps senden '' fuer "keine Angabe".
const arbeitsstaetteSchema = z
  .string()
  .nullish()
  .transform((wert) => wert ?? '');

const createFahrtSchema = z.object({
  vonOrtId: optionaleIdSchema,
  nachOrtId: optionaleIdSchema,
  datum: datumSchema,
  // Wie fahrten.anlass VARCHAR(255), sonst „Data too long“ als 500er.
  anlass: z.string().min(1, 'Anlass ist erforderlich').max(255, 'Anlass darf höchstens 255 Zeichen lang sein'),
  kilometer: kilometerSchema,
  abrechnung: z.coerce.number().int().positive('Abrechnungstraeger ist erforderlich'),
  einmaligerVonOrt: z.string().optional().nullable(),
  einmaligerNachOrt: z.string().optional().nullable(),
  // Sonst entfernt validate() das Feld.
  partnerFahrtId: optionaleIdSchema,
  mitfahrer: z.array(z.object({
    name: z.string().min(1, 'Mitfahrer-Name ist erforderlich'),
    arbeitsstaette: arbeitsstaetteSchema,
    richtung: richtungSchema,
  })).optional(),
});

const updateFahrtSchema = z.object({
  vonOrtId: optionaleIdSchema,
  nachOrtId: optionaleIdSchema,
  datum: datumSchema,
  // Wie fahrten.anlass VARCHAR(255), sonst „Data too long“ als 500er.
  anlass: z.string().min(1, 'Anlass ist erforderlich').max(255, 'Anlass darf höchstens 255 Zeichen lang sein'),
  kilometer: kilometerSchema,
  abrechnung: z.coerce.number().int().positive('Abrechnungstraeger ist erforderlich'),
  einmaligerVonOrt: z.string().optional().nullable(),
  einmaligerNachOrt: z.string().optional().nullable(),
  mitfahrer: z.array(z.object({
    id: z.coerce.number().int().positive().optional(),
    name: z.string().min(1, 'Mitfahrer-Name ist erforderlich'),
    arbeitsstaette: arbeitsstaetteSchema,
    richtung: richtungSchema,
  })).optional(),
});

const addMitfahrerSchema = z.object({
  name: z.string().min(1, 'Mitfahrer-Name ist erforderlich'),
  arbeitsstaette: arbeitsstaetteSchema,
  richtung: richtungSchema,
});

const updateMitfahrerSchema = z.object({
  name: z.string().min(1, 'Mitfahrer-Name ist erforderlich'),
  arbeitsstaette: arbeitsstaetteSchema,
  richtung: richtungSchema,
});

const abrechnungsStatusSchema = z.object({
  jahr: z.coerce.number().int().positive(),
  monat: z.coerce.number().int().min(1).max(12),
  typ: z.union([z.string().min(1), z.number()]).transform(String),
  aktion: z.string().min(1),
  datum: z.string().optional().nullable(),
});

// --- Zeitraum-Parameter: MAX_MONATE fängt Spannen wie 1/9999 ab, liegt aber über den 72 Monaten der App-Auswahl ---
const MAX_MONATE = 120;

const jahrZahlSchema = z.coerce
  .number({ error: 'Jahr muss eine Zahl sein' })
  .int('Jahr muss eine ganze Zahl sein')
  .min(2000, 'Jahr muss zwischen 2000 und 2100 liegen')
  .max(2100, 'Jahr muss zwischen 2000 und 2100 liegen');

// Als String zurück, die Handler sehen dasselbe wie vorher.
const jahrSchema = jahrZahlSchema.transform((j) => String(j));

const monatZahlSchema = z.coerce
  .number({ error: 'Monat muss eine Zahl sein' })
  .int('Monat muss eine ganze Zahl sein')
  .min(1, 'Monat muss zwischen 1 und 12 liegen')
  .max(12, 'Monat muss zwischen 1 und 12 liegen');

// Nullgepolsterter String, weil die Handler `.split('-')` aufrufen und Dateinamen bauen.
const monatSchema = monatZahlSchema.transform((m) => String(m).padStart(2, '0'));

// Träger-ID oder `mitfahrer`, kleingeschrieben.
const exportTypSchema = z
  .string()
  .regex(/^(\d+|mitfahrer)$/, 'Typ muss eine Abrechnungstraeger-ID oder "mitfahrer" sein');

// „2026-08“ bleibt als Monat gültig, die API-Doku nennt es.
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

// Spanne in Monaten inklusive; Number('08') ist 8.
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
