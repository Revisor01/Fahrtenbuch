const { z } = require('zod');

const setBetragSchema = z.object({
  betrag: z.coerce.number().min(0, 'Betrag muss mindestens 0 sein'),
  gueltig_ab: z.string().optional().nullable(),
});

const updateErstattungssatzSchema = z.object({
  betrag: z.coerce.number().min(0, 'Betrag muss mindestens 0 sein'),
  gueltig_ab: z.string().optional().nullable(),
});

module.exports = {
  setBetragSchema,
  updateErstattungssatzSchema,
};
