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

module.exports = {
  createOrtSchema,
  updateOrtSchema,
};
