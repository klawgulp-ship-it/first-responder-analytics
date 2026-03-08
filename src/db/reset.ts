import { pool } from './connection';

async function reset() {
  const client = await pool.connect();
  try {
    console.log('Dropping all tables...');
    await client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO public;
    `);
    console.log('Database reset complete. Run "npm run migrate" then "npm run seed".');
  } finally {
    client.release();
    await pool.end();
  }
}

reset().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
