const db = require('./config/database');
const bcrypt = require('bcrypt');
const migrator = require('./utils/Migrator');

async function initializeDatabase() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Erstelle Datenbank wenn nicht existiert
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}
            CHARACTER SET utf8mb4
            COLLATE utf8mb4_unicode_ci`
        );
        
        // Wähle Datenbank aus
        await connection.query(`USE ${process.env.DB_NAME}`);

        // Warte auf Migrationen
        await migrator.runMigrations();

        // Warte einen Moment bis Tabellen erstellt sind
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Prüfe auf Admin
        const [existingAdmins] = await connection.execute(
            'SELECT COUNT(*) as count FROM users WHERE role = "admin"'
        );

        if (existingAdmins[0].count === 0) {
            if (!process.env.INITIAL_ADMIN_PASSWORD || 
                !process.env.INITIAL_ADMIN_USERNAME || 
                !process.env.INITIAL_ADMIN_EMAIL) {
                throw new Error('Initial admin credentials not configured');
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(
                process.env.INITIAL_ADMIN_PASSWORD, 
                salt
            );

            const [userResult] = await connection.execute(
                'INSERT INTO users (username, password, role, email_verified) VALUES (?, ?, "admin", TRUE)',
                [process.env.INITIAL_ADMIN_USERNAME, hashedPassword]
            );

            await connection.execute(
                'INSERT INTO user_profiles (user_id, email) VALUES (?, ?)',
                [userResult.insertId, process.env.INITIAL_ADMIN_EMAIL]
            );

            console.log('Initial admin account created');
        }

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