const rateLimit = require('express-rate-limit');
// ipKeyGenerator normalisiert IPv6.
const { ipKeyGenerator } = require('express-rate-limit');

// Limits bremsen Automaten, nicht Menschen; app.js setzt `trust proxy`.

// 600 in 5 Minuten, das Dashboard lädt beim Start etwa 30.
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

// Exporte starten LibreOffice.
const exportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  message: { message: 'Zu viele Exporte in kurzer Zeit. Bitte einen Moment warten.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Erfolgreiche Logins zählen nicht mit.
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

// Großzügig, das Verzeichnis ist öffentlich, aber harmlos.
const instanzLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 120,
  message: { message: 'Zu viele Anfragen. Bitte kurz warten und erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Passwortwechsel prüft das alte Passwort, also wie der Login begrenzen; je Konto, sonst nach IP.
const passwortLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => (req.user?.id ? 'nutzer:' + req.user.id : ipKeyGenerator(req)),
  message: { message: 'Zu viele Versuche, das Passwort zu ändern. Bitte in 10 Minuten erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Mails an frei wählbare Adressen: fünf je Stunde und Konto.
const mailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => (req.user?.id ? 'nutzer:' + req.user.id : ipKeyGenerator(req)),
  message: { message: 'Zu viele E-Mails in kurzer Zeit. Bitte in einer Stunde erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  mailLimiter,
  passwortLimiter,
  schreibLimiter,
  exportLimiter,
  loginLimiter,
  registerLimiter,
  resetLimiter,
  instanzLimiter,
};
