// Platzhalter — der Container-Entrypoint (docker-entrypoint.sh) überschreibt
// diese Datei beim Start mit den Werten aus der Umgebung.
//
// Der Registrierungscode selbst gehört NICHT hierher: config.js ist öffentlich
// abrufbar. Ausgeliefert wird nur, ob überhaupt ein Code verlangt wird;
// geprüft wird er serverseitig.
window.appConfig = {
  appTitle: 'DEFAULT_TITLE',
  allowRegistration: 'DEFAULT_ALLOW_REGISTRATION',
  allowedEmailDomains: 'DEFAULT_ALLOWED_EMAIL_DOMAINS',
  registrationCodeRequired: false
};
