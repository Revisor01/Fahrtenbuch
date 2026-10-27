const { ZodError } = require('zod');

const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      // Zod 4 liefert `issues`, ohne Rückfall gäbe es einen 500er.
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

// Pfad-Parameter prüfen; einzeln zurückschreiben, weil ein Austausch von req.params verloren gehen kann.
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
