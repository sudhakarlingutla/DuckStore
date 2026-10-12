import type { ConnectionOptions } from 'mysql2/promise';
import type { DatabaseConfig } from '../config/app-config.js';

export function connectionOptions(database: DatabaseConfig): ConnectionOptions {
  return {
    host: database.host,
    port: database.port,
    user: database.user,
    password: database.password,
    database: database.name,
    // Keep DECIMAL columns as strings so prices never pass through a float.
    decimalNumbers: false,
  };
}
