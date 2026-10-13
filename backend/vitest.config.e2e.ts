import { defineConfig } from 'vitest/config';

// Tests that need a real MySQL. Start it first: docker compose up -d mysql
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/support/global-setup.ts'],
    // The files share one test database, so they must not run side by side.
    fileParallelism: false,
  },
});
