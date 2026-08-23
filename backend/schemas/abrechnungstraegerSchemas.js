const { z } = require('zod');

// Farbe des Traegers. Controller und Model verarbeiten das Feld laengst und die
// DB-Spalte gibt es auch (varchar(7)) — nur im Schema fehlte es, und Zod
// entfernt unbekannte Felder stillschweigend. Ueber die API liess sich deshalb
// nie eine Farbe setzen, sie blieb immer NULL (24.08.).
// Format wie in der Spalte vorgesehen: #RRGGBB.
const farbeSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Farbe muss im Format #RRGGBB angegeben werden')
  .optional()
  .nullable();

const createAbrechnungstraegerSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(200),
  kostenstelle: z.string().optional().nullable(),
  farbe: farbeSchema,
});

const updateAbrechnungstraegerSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(200).optional(),
  kostenstelle: z.string().optional().nullable(),
  active: z.boolean().optional(),
  farbe: farbeSchema,
});

const addErstattungssatzSchema = z.object({
  betrag: z.coerce.number().min(0, 'Betrag muss mindestens 0 sein'),
  gueltig_ab: z.string().optional().nullable(),
});

const updateErstattungssatzSchema = z.object({
  betrag: z.coerce.number().min(0, 'Betrag muss mindestens 0 sein'),
  gueltig_ab: z.string().optional().nullable(),
});

const updateSortOrderSchema = z.object({
  sortOrder: z.array(z.object({
    id: z.coerce.number().int().positive(),
    sort_order: z.coerce.number().int().min(0),
  })),
});

module.exports = {
  createAbrechnungstraegerSchema,
  updateAbrechnungstraegerSchema,
  addErstattungssatzSchema,
  updateErstattungssatzSchema,
  updateSortOrderSchema,
};
