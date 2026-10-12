import { runMigrations } from '../../src/database/migrate.js';
import { testConfig } from './test-database.js';

/** Brings the test database up to date once, before any test file runs. */
export default async function setup(): Promise<void> {
  await runMigrations(testConfig().database);
}
