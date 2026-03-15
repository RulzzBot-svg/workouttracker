/**
 * seed.js – Populate the database with schema + seed data.
 *
 * Usage:
 *   node server/seed.js              # run schema migrations then seed data
 *   node server/seed.js --schema-only # only run schema migrations
 *
 * Requires DATABASE_URL in the environment (or a .env file at the project root).
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaOnlyFlag = process.argv.includes('--schema-only');

async function runFile(label, filePath) {
  const sql = readFileSync(filePath, 'utf8');
  console.log(`Running ${label}…`);
  await pool.query(sql);
  console.log(`✅ ${label} complete.`);
}

async function main() {
  try {
    await runFile('schema migrations', join(__dirname, 'schema.sql'));

    if (!schemaOnlyFlag) {
      await runFile('seed data', join(__dirname, 'seed.sql'));
    }

    console.log('\n🎉 Database is ready.');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
