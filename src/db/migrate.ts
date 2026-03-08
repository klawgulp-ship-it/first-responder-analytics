import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { pool } from './connection';

async function migrate() {
  const client = await pool.connect();

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
    const { rows: executed } = await client.query(
      'SELECT filename FROM schema_migrations ORDER BY id'
    );
    const executedSet = new Set(executed.map((r) => r.filename));

    // Read migration files
    const migrationsDir = join(__dirname, 'migrations');
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (executedSet.has(file)) {
        console.log(`  Skipping (already applied): ${file}`);
        continue;
      }

      console.log(`  Applying: ${file}`);
      const sql = readFileSync(join(migrationsDir, file), 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`  Applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  Failed: ${file}`, err);
        throw err;
      }
    }

    console.log('\nAll migrations complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
