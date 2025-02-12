require('dotenv').config();
const db = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

class Migrator {
    constructor() {
        this.migrationsPath = path.join(__dirname, '..', 'migrations');
    }

    async initialize() {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_migration_name (name)
            )
        `);
    }

    async getExecutedMigrations() {
        const [rows] = await db.execute('SELECT name FROM migrations');
        return rows.map(row => row.name);
    }

    async executeSQLFile(connection, content) {
        console.log("Executing SQL:\n", content);
        
        // Replace environment variables
        content = content.replace(/\${DB_NAME}/g, process.env.DB_NAME);
        content = content.replace(/\${INITIAL_ADMIN_USERNAME}/g, process.env.INITIAL_ADMIN_USERNAME);
        content = content.replace(/\${INITIAL_ADMIN_EMAIL}/g, process.env.INITIAL_ADMIN_EMAIL);
        content = content.replace(/\${DEFAULT_ERSTATTUNG_TRAEGER}/g, process.env.DEFAULT_ERSTATTUNG_TRAEGER);
        content = content.replace(/\${DEFAULT_ERSTATTUNG_MITFAHRER}/g, process.env.DEFAULT_ERSTATTUNG_MITFAHRER);
        content = content.replace(/\${DEFAULT_ERSTATTUNG_DATUM}/g, process.env.DEFAULT_ERSTATTUNG_DATUM);
        content = content.replace(/\${INITIAL_TRAEGER_1_NAME}/g, process.env.INITIAL_TRAEGER_1_NAME || '');
        content = content.replace(/\${INITIAL_TRAEGER_2_NAME}/g, process.env.INITIAL_TRAEGER_2_NAME || '');
        
        // Split into statements, handling semicolons inside triggers
        const statements = [];
        let buffer = '';
        let inTrigger = false;
        
        for (const line of content.split('\n')) {
            if (line.trim().startsWith('CREATE TRIGGER')) {
                inTrigger = true;
            }
            buffer += line + '\n';
            if (inTrigger && line.trim().startsWith('END;')) {
                inTrigger = false;
                statements.push(buffer.trim());
                buffer = '';
            } else if (!inTrigger && line.trim().endsWith(';')) {
                statements.push(buffer.trim());
                buffer = '';
            }
        }
        
        // Execute statements
        for (let statement of statements) {
            try {
                console.log("Executing statement:", statement);
                await connection.query(statement);
            } catch (error) {
                console.error('Error executing SQL statement:', statement, error);
                throw error;
            }
        }
    }
    
    async runMigrations() {
        console.log('Starting migrations...');
        try {
            await this.initialize();

            const files = await fs.readdir(this.migrationsPath);
            const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
            const executedMigrations = await this.getExecutedMigrations();

            for (const file of sqlFiles) {
                if (!executedMigrations.includes(file)) {
                    console.log(`Running migration: ${file}`);
                    const connection = await db.getConnection();

                    try {
                        await connection.beginTransaction();
                        const content = await fs.readFile(
                            path.join(this.migrationsPath, file),
                            'utf8'
                        );

                        await this.executeSQLFile(connection, content);

                        await connection.execute(
                            'INSERT INTO migrations (name) VALUES (?)',
                            [file]
                        );

                        await connection.commit();
                        console.log(`Migration ${file} successful`);
                    } catch (error) {
                        await connection.rollback();
                        console.error(`Migration ${file} failed: ${error}`);
                        throw error; // Wichtig: Wirf den Fehler erneut, damit die Migration fehlschlägt
                    } finally {
                        connection.release();
                    }
                }
            }
        } catch (error) {
            console.error('Migration process failed:', error);
            throw error;
        }
    }
}

module.exports = new Migrator();