import { defineConfig } from 'vitest/config';

// Separate from vite.config.js on purpose: tests don't need the PWA plugin
// or the Pages base path, and keeping them apart means a build-config change
// can't quietly change what the tests run against.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    setupFiles: ['src/test/setup.js'],
  },
});
