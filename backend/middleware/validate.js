const { ZodError } = require('zod');

const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      // Zod 4 liefert die Fehlerliste als `issues`; `errors` existiert dort
      // nicht mehr — ohne Fallback stürzt dieser Handler selbst ab (500).
      const issues = error.issues || error.errors || [];
      return res.status(400).json({
        message: 'Validierungsfehler',
        errors: issues.map((err) => ({
          field: Array.isArray(err.path) ? err.path.join('.') : String(err.path ?? ''),
          message: err.message,
        })),
      });
    }
    next(error);
  }
};

// Dasselbe fuer Pfad-Parameter. Noetig, weil die Export- und Report-Routen
// ihre Zeitraeume ausschliesslich ueber den Pfad bekommen und ungeprueft in
// eine Monatsschleife liefen.
//
// Die geprueften Werte werden einzeln zurueckgeschrieben statt req.params zu
// ersetzen: Express legt dort einen eigenen Trager an, und ein Austausch des
// ganzen Objekts geht je nach Router-Verschachtelung verloren. Nach dem
// Schreiben stehen dort Zahlen statt Strings — die Handler parsen ohnehin.
const validateParams = (schema) => (req, res, next) => {
  try {
    const geprueft = schema.parse(req.params);
    for (const [schluessel, wert] of Object.entries(geprueft)) {
      req.params[schluessel] = wert;
    }
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues || error.errors || [];
      return res.status(400).json({
        message: 'Validierungsfehler',
        errors: issues.map((err) => ({
          field: Array.isArray(err.path) ? err.path.join('.') : String(err.path ?? ''),
          message: err.message,
        })),
      });
    }
    next(error);
  }
};

module.exports = { validate, validateParams };
