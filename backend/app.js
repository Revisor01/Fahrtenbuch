require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path'); // Import path
const initializeDatabase = require('./initDb');
const orteRoutes = require('./routes/orte');
const fahrtenRoutes = require('./routes/fahrten');
const distanzenRoutes = require('./routes/distanzen');
const abrechnungstraegerRoutes = require('./routes/abrechnungstraeger');
const mitfahrerErstattungRoutes = require('./routes/mitfahrerErstattung');
const favoritenRoutes = require('./routes/favoriten');
const apiKeyRoutes = require('./routes/apiKeys');
const profileRoutes = require('./routes/profile');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const instanzenRoutes = require('./routes/instanzen');
const { authMiddleware } = require('./middleware/authMiddleware');
const { apiLimiter, schreibLimiter, exportLimiter } = require('./middleware/rateLimiter');

const app = express();

// Pflichtvariablen beim Start pruefen statt beim ersten Login zu scheitern.
// Ohne JWT_SECRET laeuft die App an und wirft erst beim Anmelden einen 500er.
const PFLICHT_VARIABLEN = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_NAME'];
const fehlend = PFLICHT_VARIABLEN.filter((v) => !process.env[v]);
if (fehlend.length > 0) {
    console.error(`FEHLER: Diese Umgebungsvariablen fehlen: ${fehlend.join(', ')}`);
    console.error('Der Server wird nicht gestartet.');
    process.exit(1);
}

// Hinter dem Reverse Proxy (Caddy) tragen alle Requests dieselbe Quell-IP.
// Ohne trust proxy teilen sich alle Nutzenden einen Rate-Limit-Zaehler: 20
// Fehlversuche eines Einzelnen sperren den Login fuer alle.
app.set('trust proxy', 1);

// CORS_ORIGIN gilt immer, wenn gesetzt - die frühere Logik hing an NODE_ENV
// und nagelte die Testumgebung auf die Produktionsdomain fest. Ohne die
// Variable bleibt es bei der Produktionsdomain (kein '*'-Fallback).
// Kommaseparierte Liste möglich; ein Einzelwert funktioniert unverändert.
const konfigurierteOrigins = (process.env.CORS_ORIGIN || 'https://kkd-fahrtenbuch.de')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

// Die mobilen Apps laufen als WebView und schicken feste, herstellerseitig
// vergebene Origins: iOS 'capacitor://localhost', Android je nach
// androidScheme 'https://localhost' (Standard) oder 'http://localhost'.
// Beide Android-Varianten stehen drin, damit ein Wechsel des Schemas die App
// nicht aussperrt. Feste Eintraege statt Wildcard, damit die Web-Absicherung
// unangetastet bleibt.
//
// Unbedenklich trotz 'localhost': Die API authentifiziert ueber den
// Authorization-Header, nicht ueber Cookies. Eine boesartige lokale Seite
// koennte zwar Anfragen senden, haette aber kein gueltiges Token.
const APP_ORIGINS = ['capacitor://localhost', 'https://localhost', 'http://localhost'];

const erlaubteOrigins = [...new Set([...konfigurierteOrigins, ...APP_ORIGINS])];

app.use(cors({
    // Funktion statt Array: Anfragen ohne Origin-Header (native HTTP-Clients,
    // curl, Server-zu-Server, Health-Checks) sollen weiterhin durchgehen — sie
    // unterliegen keiner Same-Origin-Policy, CORS schützt dort nichts.
    // Fremde Origins werden abgelehnt: Der Callback liefert kein Fehlerobjekt,
    // sondern `false`. Damit fehlt der Access-Control-Allow-Origin-Header und
    // der Browser blockt — statt eines 500ers aus dem Fehler-Handler.
    origin: (origin, callback) => {
        if (!origin || erlaubteOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    // Cookies werden nicht genutzt (Token steckt im Authorization-Header),
    // aber explizit gesetzt, damit der Preflight konsistent beantwortet wird.
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key'  // Hier den neuen Header hinzufügen
    ]
}));
app.use(helmet());
app.use(express.json({ limit: '10mb' }));

// Define path to React build directory
const reactBuildPath = path.join(__dirname, '../frontend/public');

// Static files for React app
app.use(express.static(reactBuildPath));

// Rate-Limiting fuer die Datenrouten. Anmeldung und Passwort-Reset sind
// ausgenommen: sie tragen eigene, engere Limits, und wer sich anmelden will,
// darf nicht daran scheitern, dass jemand anderes die API ausgelastet hat.
const OHNE_GLOBALES_LIMIT = ['/api/auth/', '/api/users/reset-password', '/api/users/set-password', '/api/users/verify-email', '/api/instanzen'];
const istAuthPfad = (req) => OHNE_GLOBALES_LIMIT.some((p) => req.originalUrl.startsWith(p));

app.use('/api', (req, res, next) => (istAuthPfad(req) ? next() : apiLimiter(req, res, next)));
app.use('/api', (req, res, next) => (istAuthPfad(req) ? next() : schreibLimiter(req, res, next)));

// Exporte starten LibreOffice und sind entsprechend teuer
app.use('/api/fahrten/export', exportLimiter);
app.use('/api/fahrten/export-range', exportLimiter);
app.use('/api/fahrten/export-pdf', exportLimiter);
app.use('/api/fahrten/export-pdf-range', exportLimiter);

// API routes
// Instanz-Verzeichnis ohne authMiddleware: die App braucht es vor dem Login.
app.use('/api/instanzen', instanzenRoutes);
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

// Unbekannte API-Pfade als JSON beantworten, nicht mit der SPA
app.use('/api', (req, res) => {
    res.status(404).json({ message: 'Endpunkt nicht gefunden' });
});

// Catch-all route for SPAs. Im Container liegt kein Frontend-Build (nginx
// liefert ihn aus), deshalb hier ein sauberer Fallback statt eines ENOENT,
// das frueher im Express-Default-Handler als HTML-Stacktrace landete.
app.get('*', (req, res) => {
    const indexPfad = path.join(reactBuildPath, 'index.html');
    res.sendFile(indexPfad, (err) => {
        if (err) {
            res.status(404).send('Not found');
        }
    });
});

// Globaler Fehler-Handler: ohne ihn beantwortet Express Fehler mit einem
// HTML-Stacktrace, solange NODE_ENV nicht 'production' ist - inklusive
// Dateipfaden und interner Struktur.
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