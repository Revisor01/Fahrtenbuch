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

    async runMigrations() {
        await this.initialize();

        const files = await fs.readdir(this.migrationsPath);
        const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
        const executedMigrations = await this.getExecutedMigrations();

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

                        // Teile den SQL-Code an DELIMITER-Statements auf
                        const statements = content.split('DELIMITER');
                        
                        for (let statement of statements) {
                            statement = statement.trim();
                            if (!statement) continue;

                            if (statement.startsWith('//')) {
                                // DELIMITER // Block
                                const triggerStatements = statement
                                    .split('//\n') // Teile an Delimiter-Markern
                                    .filter(s => s.trim()); // Entferne leere Strings

                                for (const triggerStatement of triggerStatements) {
                                    if (triggerStatement.trim()) {
                                        await connection.query(triggerStatement);
                                    }
                                }
                            } else {
                                // Normale SQL Statements
                                const singleStatements = statement
                                    .split(';')
                                    .filter(s => s.trim());
                                
                                for (const singleStatement of singleStatements) {
                                    if (singleStatement.trim()) {
                                        await connection.query(singleStatement);
                                    }
                                }
                            }
                        }

                        // Markiere Migration als ausgeführt
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