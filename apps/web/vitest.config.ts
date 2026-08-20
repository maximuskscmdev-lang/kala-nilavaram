import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
    env: {
      NEXT_PUBLIC_ENABLE_DEMO_MODE: 'true',
      WHISTLEBLOWER_ENCRYPTION_KEY: 'unit-test-encryption-key-32bytes!!'
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url))
    }
  }
});