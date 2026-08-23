const { registrierungErlaubt } = require('../utils/registrierung');
// Oeffentliche Konfiguration dieser Instanz.
//
// Die Weboberflaeche bekommt diese Werte ueber config.js, das der
// Container-Entrypoint beim Start schreibt. Die mobile App hat keinen
// Container: dort blieben die Platzhalter stehen, und in der Folge fehlte
// zum Beispiel die Schaltflaeche zum Registrieren.
//
// Bewusst ohne Anmeldung erreichbar — die Werte werden gebraucht, bevor
// jemand angemeldet ist. Es darf deshalb nichts hier stehen, was nicht
// ohnehin oeffentlich ist: Der Registrierungscode selbst gehoert nicht dazu,
// nur die Information, DASS einer verlangt wird.

exports.getKonfig = async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      appTitle: process.env.REACT_APP_TITLE || 'Fahrtenbuch',
      // Registrierung gilt als erlaubt, solange sie nicht ausdruecklich
      // abgeschaltet ist — dieselbe Regel wie im Backend-Gate.
      allowRegistration: registrierungErlaubt(),
      allowedEmailDomains: process.env.ALLOWED_EMAIL_DOMAINS || '',
      registrationCodeRequired: Boolean(process.env.REGISTRATION_CODE),
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Konfiguration:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Konfiguration' });
  }
};
