import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import type { DatabaseConfig } from '../config/app-config.js';
import { connectionOptions } from './connection-options.js';

// backend/migrations, whether this runs from src/database or dist/database.
const MIGRATIONS_DIR = path.resolve(import.meta.dirname, '../../migrations');

/**
 * Applies every migration file that has not been applied yet, in file-name
 * order, and returns the names of the ones it applied.
 */
export async function runMigrations(
  database: DatabaseConfig,
): Promise<string[]> {
  const connection = await mysql.createConnection({
    ...connectionOptions(database),
    multipleStatements: true,
  });

  try {
    await connection.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name       VARCHAR(255) NOT NULL PRIMARY KEY,
         applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
       )`,
    );
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT name FROM schema_migrations',
    );
    const alreadyApplied = new Set(rows.map((row) => row.name as string));

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    const applied: string[] = [];
    for (const file of files) {
      if (alreadyApplied.has(file)) {
        continue;
      }
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      await connection.query(sql);
      await connection.query(
        'INSERT INTO schema_migrations (name) VALUES (?)',
        [file],
      );
      applied.push(file);
    }
    return applied;
  } finally {
    await connection.end();
  }
}
