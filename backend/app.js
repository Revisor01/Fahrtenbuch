require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path'); // Import path
const initializeDatabase = require('./initDb');
const { ERNEUERUNGS_HEADER } = require('./utils/tokenLaufzeit');
const orteRoutes = require('./routes/orte');
const { dokuEinhaengen } = require('./docs/dokuRoute');
const fahrtenRoutes = require('./routes/fahrten');
const distanzenRoutes = require('./routes/distanzen');
const abrechnungstraegerRoutes = require('./routes/abrechnungstraeger');
const mitfahrerErstattungRoutes = require('./routes/mitfahrerErstattung');
const favoritenRoutes = require('./routes/favoriten');
const anlaesseRoutes = require('./routes/anlaesse');
const apiKeyRoutes = require('./routes/apiKeys');
const profileRoutes = require('./routes/profile');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const instanzenRoutes = require('./routes/instanzen');
const konfigRoutes = require('./routes/konfig');
const { authMiddleware } = require('./middleware/authMiddleware');
const { apiLimiter, schreibLimiter, exportLimiter } = require('./middleware/rateLimiter');

const app = express();

// Ohne JWT_SECRET liefe die App an und scheiterte erst beim Login.
const PFLICHT_VARIABLEN = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_NAME'];
const fehlend = PFLICHT_VARIABLEN.filter((v) => !process.env[v]);
if (fehlend.length > 0) {
    console.error(`FEHLER: Diese Umgebungsvariablen fehlen: ${fehlend.join(', ')}`);
    console.error('Der Server wird nicht gestartet.');
    process.exit(1);
}

// Nur eine Warnung, ein Abbruch ließe den Server beim nächsten Deploy nicht hochkommen.
const JWT_MINDESTLAENGE = 32;
if (process.env.JWT_SECRET.length < JWT_MINDESTLAENGE) {
    console.warn(
        `WARNUNG: JWT_SECRET ist nur ${process.env.JWT_SECRET.length} Zeichen lang `
        + `(empfohlen: mindestens ${JWT_MINDESTLAENGE}). Ein kurzes Secret laesst `
        + 'sich durchprobieren. Ein Wechsel meldet alle Geraete einmal ab.'
    );
}

// Hinter Caddy, sonst teilen sich alle einen Rate-Limit-Zähler.
app.set('trust proxy', 1);

// CORS_ORIGIN gilt immer, wenn gesetzt (kommasepariert), sonst die Produktionsdomain, nie '*'.
const konfigurierteOrigins = (process.env.CORS_ORIGIN || 'https://kkd-fahrtenbuch.de')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

// Feste Origins der WebView-Apps statt Wildcard; unbedenklich, weil ohne Cookies authentifiziert wird.
const APP_ORIGINS = ['capacitor://localhost', 'https://localhost', 'http://localhost'];

const erlaubteOrigins = [...new Set([...konfigurierteOrigins, ...APP_ORIGINS])];

app.use(cors({
    // Ohne Origin durchlassen (native Clients, curl); fremde mit `false` ablehnen statt mit einem 500er.
    origin: (origin, callback) => {
        if (!origin || erlaubteOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    // Keine Cookies, aber explizit, damit der Preflight konsistent ist.
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key'  // Hier den neuen Header hinzufügen
    ],
    // Sonst ist der Header aus JavaScript nicht lesbar und die gleitende Sitzung fällt still aus.
    exposedHeaders: [ERNEUERUNGS_HEADER]
}));
// Vor helmet wegen eigener CSP und vor den /api-Limitern, sonst zählen Doku-Aufrufe mit.
app.use(['/api-docs', '/api-docs.json'], helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Swagger UI setzt Styles und Initialisierungs-Skript inline
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      // "Try it out" spricht diese Instanz an
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  // Die Doku wird nicht eingebettet und laedt nichts von fremden Hosts
  crossOriginEmbedderPolicy: false,
}));
dokuEinhaengen(app);

app.use(helmet());
app.use(express.json({ limit: '1mb' }));
// Express 5 lässt req.body ohne Körper undefined.
app.use((req, res, next) => {
    if (req.body === undefined) req.body = {};
    next();
});

// Define path to React build directory
const reactBuildPath = path.join(__dirname, '../frontend/public');

// Static files for React app
app.use(express.static(reactBuildPath));

// Anmeldung und Passwort-Reset haben eigene, engere Limits.
const OHNE_GLOBALES_LIMIT = ['/api/auth/', '/api/users/reset-password', '/api/users/set-password', '/api/users/verify-email', '/api/instanzen', '/api/konfig'];
const istAuthPfad = (req) => OHNE_GLOBALES_LIMIT.some((p) => req.originalUrl.startsWith(p));

app.use('/api', (req, res, next) => (istAuthPfad(req) ? next() : apiLimiter(req, res, next)));
app.use('/api', (req, res, next) => (istAuthPfad(req) ? next() : schreibLimiter(req, res, next)));

// Exporte starten LibreOffice und sind entsprechend teuer
app.use('/api/fahrten/export', exportLimiter);
app.use('/api/fahrten/export-range', exportLimiter);
app.use('/api/fahrten/export-pdf', exportLimiter);
app.use('/api/fahrten/export-pdf-range', exportLimiter);

// Instanz-Verzeichnis ohne authMiddleware, die App braucht es vor dem Login.
app.use('/api/instanzen', instanzenRoutes);
app.use('/api/konfig', konfigRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/keys', apiKeyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orte', authMiddleware, orteRoutes);
app.use('/api/fahrten', authMiddleware, fahrtenRoutes);
app.use('/api/distanzen', authMiddleware, distanzenRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/abrechnungstraeger', authMiddleware, abrechnungstraegerRoutes);
app.use('/api/mitfahrer-erstattung', authMiddleware, mitfahrerErstattungRoutes);
app.use('/api/favoriten', authMiddleware, favoritenRoutes);
app.use('/api/anlaesse', anlaesseRoutes);

// Unbekannte API-Pfade als JSON beantworten, nicht mit der SPA
app.use('/api', (req, res) => {
    res.status(404).json({ message: 'Endpunkt nicht gefunden' });
});

// Kein Frontend im Container, deshalb ein Fallback statt ENOENT; '*' ist in Express 5 kein Pfad mehr.
app.get('/{*rest}', (req, res) => {
    const indexPfad = path.join(reactBuildPath, 'index.html');
    res.sendFile(indexPfad, (err) => {
        if (err) {
            res.status(404).send('Not found');
        }
    });
});

// Sonst antwortet Express mit HTML-Stacktrace samt Dateipfaden.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('Unbehandelter Fehler:', err);
    if (res.headersSent) return;
    res.status(err.status || 500).json({ message: 'Interner Server-Fehler' });
});

const PORT = process.env.PORT || 5000;

(async () => {
    try {
        await initializeDatabase();
        app.listen(PORT, () => {
            console.log(`Server läuft auf Port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to initialize application:', error);
        process.exit(1);
    }
})();

module.exports = app;