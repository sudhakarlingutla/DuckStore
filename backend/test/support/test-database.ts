import mysql, { type Pool } from 'mysql2/promise';
import { loadConfig, type AppConfig } from '../../src/config/app-config.js';
import { connectionOptions } from '../../src/database/connection-options.js';

/**
 * The tests always run against the separate test database, never the one the
 * application uses, because they wipe the tables between cases.
 */
export function testConfig(): AppConfig {
  const config = loadConfig();
  return {
    ...config,
    database: {
      ...config.database,
      name: process.env.DB_TEST_NAME ?? 'duckstore_test',
    },
  };
}

export function createTestPool(): Pool {
  return mysql.createPool(connectionOptions(testConfig().database));
}

export async function clearDucks(pool: Pool): Promise<void> {
  await pool.query('TRUNCATE TABLE ducks');
}
