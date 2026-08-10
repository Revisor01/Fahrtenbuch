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
const { authMiddleware } = require('./middleware/authMiddleware');
const util = require('util');

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
const corsOrigin = process.env.CORS_ORIGIN || 'https://kkd-fahrtenbuch.de';

app.use(cors({
    origin: corsOrigin,
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

// API routes
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