const { z } = require('zod');

const createOrtSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(200),
  adresse: z.string().min(1, 'Adresse ist erforderlich'),
  istWohnort: z.boolean().optional().default(false),
  istDienstort: z.boolean().optional().default(false),
  istKirchspiel: z.boolean().optional().default(false),
});

const updateOrtSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(200),
  adresse: z.string().min(1, 'Adresse ist erforderlich'),
  ist_wohnort: z.boolean().optional().default(false),
  ist_dienstort: z.boolean().optional().default(false),
  ist_kirchspiel: z.boolean().optional().default(false),
});

// Bulk-Umsortierung per Drag & Drop. Gleiche Form wie bei den
// Abrechnungstraegern, damit sich das Frontend nicht umgewoehnen muss.
const updateSortOrderSchema = z.object({
  sortOrder: z.array(z.object({
    id: z.coerce.number().int().positive(),
    sort_order: z.coerce.number().int().min(0),
  })),
});

module.exports = {
  createOrtSchema,
  updateOrtSchema,
  updateSortOrderSchema,
};
