"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const connection_1 = require("./connection");
async function migrate() {
    const client = await connection_1.pool.connect();
    try {
        // Create migrations tracking table
        await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
        // Get already-run migrations
        const { rows: executed } = await client.query('SELECT filename FROM schema_migrations ORDER BY id');
        const executedSet = new Set(executed.map((r) => r.filename));
        // Read migration files
        const migrationsDir = (0, path_1.join)(__dirname, 'migrations');
        const files = (0, fs_1.readdirSync)(migrationsDir)
            .filter((f) => f.endsWith('.sql'))
            .sort();
        for (const file of files) {
            if (executedSet.has(file)) {
                console.log(`  Skipping (already applied): ${file}`);
                continue;
            }
            console.log(`  Applying: ${file}`);
            const sql = (0, fs_1.readFileSync)((0, path_1.join)(migrationsDir, file), 'utf-8');
            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
                await client.query('COMMIT');
                console.log(`  Applied: ${file}`);
            }
            catch (err) {
                await client.query('ROLLBACK');
                console.error(`  Failed: ${file}`, err);
                throw err;
            }
        }
        console.log('\nAll migrations complete.');
    }
    finally {
        client.release();
        await connection_1.pool.end();
    }
}
migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
//# sourceMappingURL=migrate.js.map