const { z } = require('zod');

// Instanz-Verzeichnis fuer die mobilen Apps.
//
// Die Liste kommt aus der Umgebungsvariable INSTANZEN (JSON-Array). Sie wird
// hier validiert statt blind ausgeliefert: Eine kaputte oder zu grosszuegige
// Konfiguration wuerde sonst als oeffentlich abrufbare API-Antwort landen.
// Deshalb ist das Schema `strict` — unbekannte Felder (etwa versehentlich
// mitkopierte Zugangsdaten) fliegen raus, statt oeffentlich zu werden.

const instanzSchema = z.object({
  id: z.string()
    .min(1, 'Instanz-ID ist erforderlich')
    .max(64)
    // Slug-Format: die App nutzt die ID als stabilen Schluessel im lokalen
    // Speicher, deshalb keine Sonderzeichen.
    .regex(/^[a-z0-9-]+$/, 'Instanz-ID darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten'),
  name: z.string().min(1, 'Anzeigename ist erforderlich').max(120),
  apiUrl: z.string()
    .url('API-Basis-URL ist keine gueltige URL')
    .max(255)
    // Nur HTTPS: die App schickt hierhin Anmeldedaten. Eine per Fehlkonfiguration
    // eingeschleuste http://-URL waere ein Klartext-Login.
    .refine((wert) => wert.startsWith('https://'), 'API-Basis-URL muss mit https:// beginnen'),
}).strict();

const instanzenSchema = z.array(instanzSchema).min(1, 'Mindestens eine Instanz ist erforderlich');

module.exports = {
  instanzSchema,
  instanzenSchema,
};
