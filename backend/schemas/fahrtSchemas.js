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

const createFahrtSchema = z.object({
  vonOrtId: z.coerce.number().int().positive().nullable().optional(),
  nachOrtId: z.coerce.number().int().positive().nullable().optional(),
  datum: z.string().min(1, 'Datum ist erforderlich'),
  anlass: z.string().min(1, 'Anlass ist erforderlich'),
  kilometer: z.coerce.number().positive().optional().nullable(),
  abrechnung: z.coerce.number().int().positive('Abrechnungstraeger ist erforderlich'),
  einmaligerVonOrt: z.string().optional().nullable(),
  einmaligerNachOrt: z.string().optional().nullable(),
  // Gegenfahrt desselben Hin-und-Rueck-Paares. Ohne Eintrag hier wuerde
  // validate() das Feld aus dem Body entfernen, bevor der Controller es sieht.
  partnerFahrtId: z.coerce.number().int().positive().nullable().optional(),
  mitfahrer: z.array(z.object({
    name: z.string().min(1, 'Mitfahrer-Name ist erforderlich'),
    arbeitsstaette: z.string().optional().nullable(),
    richtung: richtungSchema,
  })).optional(),
});

const updateFahrtSchema = z.object({
  vonOrtId: z.coerce.number().int().positive().nullable().optional(),
  nachOrtId: z.coerce.number().int().positive().nullable().optional(),
  datum: z.string().min(1, 'Datum ist erforderlich'),
  anlass: z.string().min(1, 'Anlass ist erforderlich'),
  kilometer: z.coerce.number().positive().optional().nullable(),
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

module.exports = {
  createFahrtSchema,
  updateFahrtSchema,
  addMitfahrerSchema,
  updateMitfahrerSchema,
  abrechnungsStatusSchema,
};
