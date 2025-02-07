const db = require('./config/database');
const bcrypt = require('bcrypt');
const migrator = require('./utils/Migrator');

async function initializeDatabase() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Wähle Datenbank aus
        await connection.query(`USE ${process.env.DB_NAME}`);

        // Warte auf Migrationen
        await migrator.runMigrations();

        await connection.commit();
        console.log('Database initialization completed successfully');

    } catch (error) {
        await connection.rollback();
        console.error('Database initialization error:', error);
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = initializeDatabase;