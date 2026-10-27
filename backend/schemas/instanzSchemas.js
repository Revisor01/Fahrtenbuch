const { z } = require('zod');

// Instanz-Verzeichnis aus INSTANZEN, strict, damit versehentlich mitkopierte Felder nicht öffentlich werden.

const instanzSchema = z.object({
  id: z.string()
    .min(1, 'Instanz-ID ist erforderlich')
    .max(64)
    // Slug, die App nutzt die ID als Schlüssel im lokalen Speicher.
    .regex(/^[a-z0-9-]+$/, 'Instanz-ID darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten'),
  name: z.string().min(1, 'Anzeigename ist erforderlich').max(120),
  apiUrl: z.string()
    .url('API-Basis-URL ist keine gueltige URL')
    .max(255)
    // Nur HTTPS, hierhin gehen Anmeldedaten.
    .refine((wert) => wert.startsWith('https://'), 'API-Basis-URL muss mit https:// beginnen'),
}).strict();

const instanzenSchema = z.array(instanzSchema).min(1, 'Mindestens eine Instanz ist erforderlich');

module.exports = {
  instanzSchema,
  instanzenSchema,
};
