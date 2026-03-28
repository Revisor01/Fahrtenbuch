const { z } = require('zod');

const createFavoritSchema = z.object({
  vonOrtId: z.number().int().positive('Von-Ort ist erforderlich'),
  nachOrtId: z.number().int().positive('Nach-Ort ist erforderlich'),
  anlass: z.string().min(1, 'Anlass ist erforderlich').max(500),
  abrechnungstraegerId: z.number().int().positive('Abrechnungstraeger ist erforderlich'),
  sortOrder: z.number().int().optional().default(0),
});

module.exports = {
  createFavoritSchema,
};
