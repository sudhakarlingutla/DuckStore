import { loadConfig } from './app-config.js';

describe('loadConfig', () => {
  it('falls back to the docker-compose defaults when nothing is set', () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      database: {
        host: 'localhost',
        port: 3307,
        user: 'duck',
        password: 'duck_local_only',
        name: 'duckstore',
      },
    });
  });

  it('reads overrides from the environment', () => {
    const config = loadConfig({
      PORT: '8080',
      DB_HOST: 'mysql',
      DB_PORT: '3306',
      DB_NAME: 'duckstore_test',
    });

    expect(config.port).toBe(8080);
    expect(config.database).toMatchObject({
      host: 'mysql',
      port: 3306,
      name: 'duckstore_test',
    });
  });

  it.each(['abc', '0', '70000', '80.5'])('rejects "%s" as a port', (value) => {
    expect(() => loadConfig({ DB_PORT: value })).toThrow(/DB_PORT/);
  });
});
