const { z } = require('zod');

const createApiKeySchema = z.object({
  description: z.string().min(1, 'Beschreibung ist erforderlich').max(200),
});

module.exports = {
  createApiKeySchema,
};
