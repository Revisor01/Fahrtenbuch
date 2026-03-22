const { z } = require('zod');

const createDistanzSchema = z.object({
  vonOrtId: z.coerce.number().int().positive('Von-Ort ist erforderlich'),
  nachOrtId: z.coerce.number().int().positive('Nach-Ort ist erforderlich'),
  distanz: z.coerce.number().positive('Distanz muss positiv sein'),
});

const updateDistanzSchema = z.object({
  vonOrtId: z.coerce.number().int().positive('Von-Ort ist erforderlich'),
  nachOrtId: z.coerce.number().int().positive('Nach-Ort ist erforderlich'),
  distanz: z.coerce.number().positive('Distanz muss positiv sein'),
});

module.exports = {
  createDistanzSchema,
  updateDistanzSchema,
};
