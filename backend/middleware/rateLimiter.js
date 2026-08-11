const rateLimit = require('express-rate-limit');

// Rate-Limiting an einer Stelle.
//
// Die App hat rund 30 bekannte Nutzende hinter einem Login. Die Limits sind
// deshalb so gesetzt, dass normales Arbeiten nie anschlägt — sie bremsen
// automatisierte Anfragen, nicht Menschen.
//
// Wichtig: app.js setzt `trust proxy`, sonst zählen hinter Caddy alle Anfragen
// auf dieselbe IP und ein einzelner Nutzer sperrt alle anderen aus.

// Grundschutz für alle API-Routen. 600 Anfragen in 5 Minuten sind großzügig:
// Das Dashboard lädt beim Start rund 30 Requests, ein Monatswechsel je einen
// weiteren. Wer das überschreitet, ist kein Mensch am Formular.
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 600,
  message: { message: 'Zu viele Anfragen. Bitte kurz warten und erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Schreibende Zugriffe enger fassen als Lesen — hier entstehen Datensätze.
const schreibLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 200,
  message: { message: 'Zu viele Änderungen in kurzer Zeit. Bitte kurz warten.' },
  standardHeaders: true,
  legacyHeaders: false,
  // GET/HEAD/OPTIONS laufen über den apiLimiter
  skip: (req) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method),
});

// Exporte erzeugen Excel- bzw. PDF-Dateien und starten dafür LibreOffice.
// Das ist teuer genug, um es gesondert zu begrenzen.
const exportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  message: { message: 'Zu viele Exporte in kurzer Zeit. Bitte einen Moment warten.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Anmeldung: Vertippen darf niemanden aussperren, erfolgreiche Logins zählen
// nicht mit — gebremst wird nur das Durchprobieren.
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  message: { message: 'Zu viele Login-Versuche. Bitte in 10 Minuten erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { message: 'Zu viele Registrierungsversuche. Bitte in 10 Minuten erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Passwort-Reset und Token-Einlösung: ohne Anmeldung erreichbar, deshalb eng.
const resetLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { message: 'Zu viele Passwort-Reset-Anfragen. Bitte in 10 Minuten erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  schreibLimiter,
  exportLimiter,
  loginLimiter,
  registerLimiter,
  resetLimiter,
};
