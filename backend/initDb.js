const db = require('./config/database');
const bcrypt = require('bcrypt');
const migrator = require('./utils/Migrator');

async function initializeDatabase() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Erstelle und wähle Datenbank
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}
            CHARACTER SET utf8mb4
            COLLATE utf8mb4_unicode_ci`
        );
        await connection.query(`USE ${process.env.DB_NAME}`);

        // Setze Standardwerte
        await connection.query(
            'SET @default_erstattung_traeger = ?', 
            [process.env.DEFAULT_ERSTATTUNG_TRAEGER || '0.30']
        );
        await connection.query(
            'SET @default_erstattung_mitfahrer = ?', 
            [process.env.DEFAULT_ERSTATTUNG_MITFAHRER || '0.05']
        );
        await connection.query(
            'SET @default_erstattung_datum = ?', 
            [process.env.DEFAULT_ERSTATTUNG_DATUM || '2024-01-01']
        );

        // Führe Migrationen aus
        await migrator.runMigrations();

        // Warte kurz bis Tabellen erstellt sind
        await new Promise(resolve => setTimeout(resolve, 1000));

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
                `INSERT INTO users (
                    username, 
                    password, 
                    role, 
                    email_verified
                ) VALUES (?, ?, 'admin', TRUE)`,
                [process.env.INITIAL_ADMIN_USERNAME, hashedPassword]
            );

            await connection.execute(
                `INSERT INTO user_profiles (
                    user_id, 
                    email
                ) VALUES (?, ?)`,
                [userResult.insertId, process.env.INITIAL_ADMIN_EMAIL]
            );

            console.log('Initial admin account created');
        }

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = async function() {
    try {
        await initializeDatabase();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
};