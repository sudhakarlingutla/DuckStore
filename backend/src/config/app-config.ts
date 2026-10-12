export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  name: string;
}

export interface AppConfig {
  port: number;
  database: DatabaseConfig;
}

export const APP_CONFIG = Symbol('APP_CONFIG');

type Env = Record<string, string | undefined>;

/**
 * Builds the configuration from environment variables. The defaults match
 * docker-compose.yml, so a fresh clone runs without any .env file.
 * Fails fast on a malformed value rather than starting half-configured.
 */
export function loadConfig(env: Env = process.env): AppConfig {
  return {
    port: readPort(env, 'PORT', 3000),
    database: {
      host: env.DB_HOST ?? 'localhost',
      port: readPort(env, 'DB_PORT', 3307),
      user: env.DB_USER ?? 'duck',
      password: env.DB_PASSWORD ?? 'duck_local_only',
      name: env.DB_NAME ?? 'duckstore',
    },
  };
}

function readPort(env: Env, key: string, fallback: number): number {
  const raw = env[key];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `${key} must be a port number between 1 and 65535, got "${raw}"`,
    );
  }
  return port;
}
