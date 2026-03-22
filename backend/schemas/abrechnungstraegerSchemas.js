const { z } = require('zod');

const createAbrechnungstraegerSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(200),
  kostenstelle: z.string().optional().nullable(),
});

const updateAbrechnungstraegerSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(200).optional(),
  kostenstelle: z.string().optional().nullable(),
  active: z.boolean().optional(),
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
