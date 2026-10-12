import { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { APP_CONFIG } from '../../src/config/app-config.js';
import { testConfig } from './test-database.js';

/**
 * Starts the real application, configured as in production but pointed at
 * the test database. Extra controllers can be added for test-only routes.
 *
 * It listens on a free port so that many requests can be in flight at once,
 * which the concurrency tests rely on.
 */
export async function createTestApp(
  extraControllers: Type[] = [],
): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: extraControllers,
  })
    .overrideProvider(APP_CONFIG)
    .useValue(testConfig())
    .compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.listen(0);
  return app;
}
