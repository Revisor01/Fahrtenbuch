const { z } = require('zod');

// max 255 entsprechend anlaesse.name VARCHAR(255)
const createAnlassSchema = z.object({
  name: z.string().trim().min(1, 'Name ist erforderlich').max(255),
  sortOrder: z.number().int().optional().default(0),
});

// Alle Felder optional: das Frontend sortiert um, ohne den Namen mitzuschicken.
const updateAnlassSchema = z.object({
  name: z.string().trim().min(1, 'Name ist erforderlich').max(255).optional(),
  sortOrder: z.number().int().optional(),
  aktiv: z.boolean().optional(),
}).refine(
  (daten) => Object.keys(daten).length > 0,
  { message: 'Es wurde kein Feld zum Aktualisieren uebergeben' }
);

module.exports = {
  createAnlassSchema,
  updateAnlassSchema,
};
