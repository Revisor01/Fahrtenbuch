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

        // Hash Passwort und ersetze Platzhalter
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(process.env.INITIAL_ADMIN_PASSWORD, salt);

        // Update Passwort nur, wenn der Benutzer existiert
        const [existingUsers] = await connection.execute('SELECT id FROM users WHERE username = ?', [process.env.INITIAL_ADMIN_USERNAME]);
        if (existingUsers.length > 0) {
            await connection.execute(`
                UPDATE users
                SET password = ?
                WHERE username = ?
            `, [hashedPassword, process.env.INITIAL_ADMIN_USERNAME]);
        } else {
            console.warn('Admin user not found. Skipping password update.');
        }

        await connection.commit();
        console.log('Database initialization completed successfully');

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