import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.integration.test.ts',
        'src/server/db/migrations/**',
        'src/server/db/seeds/**',
        'src/**/*.d.ts',
      ],
      // Floor measured from the unit run only (the DB/service layer is exercised
      // by the integration suite, `pnpm test:db`, which is not part of this gate).
      // Ratchet upward as coverage improves.
      thresholds: {
        statements: 35,
        branches: 35,
        functions: 35,
        lines: 35,
      },
    },
  },
})
