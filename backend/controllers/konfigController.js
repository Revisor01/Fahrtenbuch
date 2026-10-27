const { registrierungErlaubt } = require('../utils/registrierung');
// Öffentliche Konfiguration für die App, die keine config.js bekommt; der Registrierungscode selbst bleibt geheim.

exports.getKonfig = async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      appTitle: process.env.REACT_APP_TITLE || 'Fahrtenbuch',
      // Erlaubt, solange nicht abgeschaltet, wie im Backend-Gate.
      allowRegistration: registrierungErlaubt(),
      allowedEmailDomains: process.env.ALLOWED_EMAIL_DOMAINS || '',
      registrationCodeRequired: Boolean(process.env.REGISTRATION_CODE),
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Konfiguration:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Konfiguration' });
  }
};
