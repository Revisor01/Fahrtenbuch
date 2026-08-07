// initDb.js
const db = require('./config/database');
const bcrypt = require('bcrypt');
const migrator = require('./utils/Migrator');

async function initializeDatabase() {
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Wähle Datenbank aus
        await connection.query(`USE ${process.env.DB_NAME}`);

        // Warte auf Migrationen
        await migrator.runMigrations();

        // Initial-Passwort nur beim Erstlauf setzen: Migration 0002_admin_user.sql legt
        // den Admin mit dem Literal 'PLACEHOLDER_PASSWORD_HASH' an — nur dann hashen/setzen.
        const [existingUsers] = await connection.execute('SELECT id, password FROM users WHERE username = ?', [process.env.INITIAL_ADMIN_USERNAME]);
        if (existingUsers.length > 0) {
            if (existingUsers[0].password === 'PLACEHOLDER_PASSWORD_HASH') {
                const salt = await bcrypt.genSalt(12);
                const hashedPassword = await bcrypt.hash(process.env.INITIAL_ADMIN_PASSWORD, salt);
                await connection.execute(`
                    UPDATE users
                    SET password = ?
                    WHERE username = ? AND password = 'PLACEHOLDER_PASSWORD_HASH'
                `, [hashedPassword, process.env.INITIAL_ADMIN_USERNAME]);
                console.info('Admin-Passwort beim Erstlauf gesetzt.');
            } else {
                console.info('Admin-Passwort bereits gesetzt — kein Reset.');
            }
        } else {
            console.warn('Admin user not found. Skipping password update.');
        }

        await connection.commit();
        console.info('Database initialization completed successfully');

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Database initialization error:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

module.exports = initializeDatabase;