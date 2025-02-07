const db = require('./config/database');
const bcrypt = require('bcrypt');
const migrator = require('./utils/Migrator');

async function initializeDatabase() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        // Erstelle Datenbank falls nicht vorhanden
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}
            CHARACTER SET utf8mb4
            COLLATE utf8mb4_unicode_ci`
        );
        
        // Wechsle zur Datenbank
        await connection.query(`USE ${process.env.DB_NAME}`);
        
        // Führe Migrationen aus
        await migrator.runMigrations();
        
        // Setze Standardwerte für Erstattungen - einzeln ausführen
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
        
        // Prüfe ob bereits ein Admin existiert
        const [existingAdmins] = await connection.execute(
            'SELECT COUNT(*) as count FROM users WHERE role = "admin"'
        );
        
        if (existingAdmins[0].count === 0) {
            console.log('Creating initial admin user...');
            
            if (!process.env.INITIAL_ADMIN_PASSWORD || 
                !process.env.INITIAL_ADMIN_USERNAME || 
                !process.env.INITIAL_ADMIN_EMAIL) {
                    throw new Error('Initial admin credentials not configured in environment variables');
                }
            
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(
                process.env.INITIAL_ADMIN_PASSWORD,
                salt
            );
            
            // Erstelle Admin User
            const [userResult] = await connection.execute(
                `INSERT INTO users (
                    username, 
                    password, 
                    role, 
                    email_verified
                ) VALUES (?, ?, 'admin', TRUE)`,
                [process.env.INITIAL_ADMIN_USERNAME, hashedPassword]
            );
            
            // Erstelle Admin Profil
            await connection.execute(
                `INSERT INTO user_profiles (
                    user_id, 
                    email
                ) VALUES (?, ?)`,
                [userResult.insertId, process.env.INITIAL_ADMIN_EMAIL]
            );
            
            console.log('Initial admin account created');
            console.log('Username:', process.env.INITIAL_ADMIN_USERNAME);
            console.log('Email:', process.env.INITIAL_ADMIN_EMAIL);
        }
        
        await connection.commit();
        console.log('Database initialization completed successfully');
    } catch (error) {
        await connection.rollback();
        console.error('Error initializing database:', error);
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