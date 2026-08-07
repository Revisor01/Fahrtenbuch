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

module.exports = { validate };
