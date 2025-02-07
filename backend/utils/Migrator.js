const db = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

class Migrator {
    constructor() {
        this.migrationsPath = path.join(__dirname, '..', 'migrations');
    }

    async initialize() {
        // Erstelle migrations Tabelle falls nicht vorhanden
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

    async runMigrations() {
        await this.initialize();

        // Hole alle Migrationsdateien
        const files = await fs.readdir(this.migrationsPath);
        const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

        // Hole bereits ausgeführte Migrationen
        const executedMigrations = await this.getExecutedMigrations();

        // Führe neue Migrationen aus
        for (const file of sqlFiles) {
            if (!executedMigrations.includes(file)) {
                console.log(`Running migration: ${file}`);
                try {
                    const content = await fs.readFile(
                        path.join(this.migrationsPath, file),
                        'utf8'
                    );

                    const connection = await db.getConnection();
                    try {
                        await connection.beginTransaction();

                        // Führe Migration aus
                        await connection.execute(content);

                        // Markiere als ausgeführt
                        await connection.execute(
                            'INSERT INTO migrations (name) VALUES (?)',
                            [file]
                        );

                        await connection.commit();
                        console.log(`Migration ${file} successful`);
                    } catch (error) {
                        await connection.rollback();
                        console.error(`Migration ${file} failed:`, error);
                        throw error;
                    } finally {
                        connection.release();
                    }
                } catch (error) {
                    console.error(`Error in migration ${file}:`, error);
                    throw error;
                }
            }
        }
    }
}

module.exports = new Migrator();