import { existsSync } from 'node:fs';
import { loadConfig } from '../config/app-config.js';
import { runMigrations } from './migrate.js';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const { database } = loadConfig();
const applied = await runMigrations(database);

console.log(
  applied.length === 0
    ? `Database "${database.name}" is already up to date.`
    : `Applied to "${database.name}": ${applied.join(', ')}`,
);
