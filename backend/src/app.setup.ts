import { INestApplication } from '@nestjs/common';

/**
 * HTTP-level settings shared by the real server and the HTTP tests, so the
 * tests exercise the application exactly as it is served.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
}
