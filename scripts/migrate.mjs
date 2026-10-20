import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is missing');
  process.exit(1);
}

const sql = neon(url);
const file = resolve(process.cwd(), 'scripts/migrate.sql');
const statements = readFileSync(file, 'utf8')
  .split(';')
  .map((part) => part.trim())
  .filter(Boolean);

for (const statement of statements) {
  await sql.query(statement, []);
  console.log('OK:', statement.slice(0, 60).replace(/\s+/g, ' '), '...');
}

console.log('Migration complete');
