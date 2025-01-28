require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path'); // Import path
const orteRoutes = require('./routes/orte');
const fahrtenRoutes = require('./routes/fahrten');
const distanzenRoutes = require('./routes/distanzen');
const abrechnungstraegerRoutes = require('./routes/abrechnungstraeger');
const mitfahrerErstattungRoutes = require('./routes/mitfahrerErstattung');
const apiKeyRoutes = require('./routes/apiKeys');
const profileRoutes = require('./routes/profile');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const { authMiddleware } = require('./middleware/authMiddleware');
const util = require('util');

const app = express();

function detailedLog(obj) {
    console.log(util.inspect(obj, { showHidden: false, depth: null, colors: true }));
}

// Logging Middleware
app.use((req, res, next) => {
    console.log(`\n${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Query parameters:');
    detailedLog(req.query);
    console.log('Request body:');
    detailedLog(req.body);
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error occurred:', err);
    res.status(500).json({
        message: 'Ein Fehler ist aufgetreten',
        error: err.message,
        stack: err.stack
    });
});

app.use(cors({
    origin: 'https://fahrtenbuch.godsapp.de',
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
app.use(express.json());

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

// Catch-all route for SPAs
app.get('*', (req, res) => {
    res.sendFile(path.join(reactBuildPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});

module.exports = app;