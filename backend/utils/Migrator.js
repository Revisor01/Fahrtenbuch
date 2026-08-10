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
        
        // Replace environment variables
        content = content.replace(/\${DB_NAME}/g, process.env.DB_NAME);
        content = content.replace(/\${INITIAL_ADMIN_USERNAME}/g, process.env.INITIAL_ADMIN_USERNAME);
        content = content.replace(/\${INITIAL_ADMIN_EMAIL}/g, process.env.INITIAL_ADMIN_EMAIL);
        content = content.replace(/\${DEFAULT_ERSTATTUNG_TRAEGER}/g, process.env.DEFAULT_ERSTATTUNG_TRAEGER);
        content = content.replace(/\${DEFAULT_ERSTATTUNG_MITFAHRER}/g, process.env.DEFAULT_ERSTATTUNG_MITFAHRER);
        content = content.replace(/\${DEFAULT_ERSTATTUNG_DATUM}/g, process.env.DEFAULT_ERSTATTUNG_DATUM);
        content = content.replace(/\${INITIAL_TRAEGER_1_NAME}/g, process.env.INITIAL_TRAEGER_1_NAME || '');
        content = content.replace(/\${INITIAL_TRAEGER_2_NAME}/g, process.env.INITIAL_TRAEGER_2_NAME || '');
        content = content.replace(/\${STANDARD_ORT_1_NAME}/g, process.env.STANDARD_ORT_1_NAME || '');
        content = content.replace(/\${STANDARD_ORT_1_ADRESSE}/g, process.env.STANDARD_ORT_1_ADRESSE || '');
        content = content.replace(/\${STANDARD_ORT_2_NAME}/g, process.env.STANDARD_ORT_2_NAME || '');
        content = content.replace(/\${STANDARD_ORT_2_ADRESSE}/g, process.env.STANDARD_ORT_2_ADRESSE || '');
        
        // Split into statements, handling semicolons inside triggers.
        // Ein Trigger zaehlt nur dann als mehrzeilig, wenn er tatsaechlich einen
        // BEGIN-Block oeffnet - sonst beendet ihn wie jedes andere Statement das
        // erste Semikolon. Frueher blieb der Parser bei Single-Statement-Triggern
        // bis zum Dateiende im Trigger-Modus und verwarf alles Folgende still.
        const statements = [];
        let buffer = '';
        let inTrigger = false;
        let triggerHatBegin = false;

        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!inTrigger && trimmed.startsWith('CREATE TRIGGER')) {
                inTrigger = true;
                triggerHatBegin = false;
            }
            if (inTrigger && /\bBEGIN\b/i.test(trimmed)) {
                triggerHatBegin = true;
            }
            buffer += line + '\n';

            if (inTrigger) {
                // Mit BEGIN-Block: erst END; schliesst ab. Ohne: normales Semikolon.
                const endeErreicht = triggerHatBegin
                    ? /^END\s*;/i.test(trimmed)
                    : trimmed.endsWith(';');
                if (endeErreicht) {
                    inTrigger = false;
                    triggerHatBegin = false;
                    statements.push(buffer.trim());
                    buffer = '';
                }
            } else if (trimmed.endsWith(';')) {
                statements.push(buffer.trim());
                buffer = '';
            }
        }

        // Rest nicht verwerfen: ein unvollstaendiges Statement muss auffallen,
        // nicht stillschweigend verschwinden.
        if (buffer.trim()) {
            statements.push(buffer.trim());
        }

        // Execute statements
        for (let statement of statements) {
            try {
                await connection.query(statement);
            } catch (error) {
                // Nur die erste Zeile loggen: die Statements enthalten
                // eingesetzte Umgebungsvariablen (Admin-Mail, Startpasswoerter),
                // die sonst im Klartext im Log landen.
                const kurz = statement.split('\n').find((z) => z.trim() && !z.trim().startsWith('--')) || '';
                console.error(`Fehler beim Ausführen eines SQL-Statements (${kurz.trim().slice(0, 60)}…):`, error.sqlMessage || error.message);
                throw error;
            }
        }
    }
    
    async runMigrations() {
        console.info('Starting migrations...');
        try {
            await this.initialize();

            const files = await fs.readdir(this.migrationsPath);
            const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
            const executedMigrations = await this.getExecutedMigrations();

            for (const file of sqlFiles) {
                if (!executedMigrations.includes(file)) {
                    console.info(`Running migration: ${file}`);
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
                        console.info(`Migration ${file} successful`);
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