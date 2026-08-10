const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // DECIMAL-Spalten (kilometer, betrag) kamen sonst als String zurueck.
  // "0 + '12.50'" ergibt in JS "012.50" statt 12.5 - Summen wurden dadurch zu
  // aneinandergehaengten Zeichenketten.
  decimalNumbers: true
});

module.exports = pool.promise();