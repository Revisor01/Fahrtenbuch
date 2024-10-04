require('dotenv').config();
const express = require('express');
const cors = require('cors');
const orteRoutes = require('./routes/orte');
const fahrtenRoutes = require('./routes/fahrten');
const distanzenRoutes = require('./routes/distanzen');
const authRoutes = require('./routes/auth'); // Neue Zeile
const authMiddleware = require('./middleware/authMiddleware'); // Neue Zeile
const util = require('util');
const app = express();

function detailedLog(obj) {
  console.log(util.inspect(obj, {showHidden: false, depth: null, colors: true}));
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

// Fehlerbehandlungs-Middleware
app.use((err, req, res, next) => {
  console.error('Error occurred:');
  detailedLog(err);
  res.status(500).json({ message: 'Ein Fehler ist aufgetreten', error: err.message });
});

app.use(cors({
  origin: 'https://fahrtenbuch.godsapp.de',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.use('/api/auth', authRoutes); // Neue Zeile
app.use('/api/orte', authMiddleware, orteRoutes);
app.use('/api/fahrten', authMiddleware, fahrtenRoutes);
app.use('/api/distanzen', authMiddleware, distanzenRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});

module.exports = app;