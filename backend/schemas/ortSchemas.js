const { z } = require('zod');

// Anlegen nahm bisher nur camelCase (`istWohnort`), Aendern nur snake_case
// (`ist_wohnort`) — dieselbe Sache, zwei Schreibweisen, je nach Methode. Wer
// einen eigenen Client baut, faellt darauf herein: Das falsche Feld wird von
// Zod stillschweigend entfernt und das Kennzeichen landet als false in der DB
// (24.08.).
//
// Jetzt gelten beide Formen, snake_case hat Vorrang (so schickt es die App).
// Der Controller liest weiterhin camelCase — das Umschreiben passiert hier.
const createOrtSchema = z
  .object({
    name: z.string().min(1, 'Name ist erforderlich').max(200),
    adresse: z.string().min(1, 'Adresse ist erforderlich'),
    istWohnort: z.boolean().optional(),
    istDienstort: z.boolean().optional(),
    istKirchspiel: z.boolean().optional(),
    ist_wohnort: z.boolean().optional(),
    ist_dienstort: z.boolean().optional(),
    ist_kirchspiel: z.boolean().optional(),
  })
  .transform((eingabe) => ({
    name: eingabe.name,
    adresse: eingabe.adresse,
    istWohnort: eingabe.ist_wohnort ?? eingabe.istWohnort ?? false,
    istDienstort: eingabe.ist_dienstort ?? eingabe.istDienstort ?? false,
    istKirchspiel: eingabe.ist_kirchspiel ?? eingabe.istKirchspiel ?? false,
  }));

const updateOrtSchema = z
  .object({
    name: z.string().min(1, 'Name ist erforderlich').max(200),
    adresse: z.string().min(1, 'Adresse ist erforderlich'),
    ist_wohnort: z.boolean().optional(),
    ist_dienstort: z.boolean().optional(),
    ist_kirchspiel: z.boolean().optional(),
    istWohnort: z.boolean().optional(),
    istDienstort: z.boolean().optional(),
    istKirchspiel: z.boolean().optional(),
  })
  .transform((eingabe) => ({
    name: eingabe.name,
    adresse: eingabe.adresse,
    ist_wohnort: eingabe.ist_wohnort ?? eingabe.istWohnort ?? false,
    ist_dienstort: eingabe.ist_dienstort ?? eingabe.istDienstort ?? false,
    ist_kirchspiel: eingabe.ist_kirchspiel ?? eingabe.istKirchspiel ?? false,
  }));

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
