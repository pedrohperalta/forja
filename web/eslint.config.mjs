import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import nextPlugin from '@next/eslint-plugin-next'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url))

// Architectural boundary: a route handler must reach the database through the
// service layer, never the repositories (or db client) directly.
const serverOnlyFromClient = {
  group: ['@/server', '@/server/*', '@/server/**'],
  message: 'Client components must not import server-only code (@/server/**).',
  allowTypeImports: true,
}

export default tseslint.config(
  {
    ignores: [
      '.next/',
      'node_modules/',
      'next-env.d.ts',
      'src/server/db/migrations/',
    ],
  },

  // Type-checked linting for application source.
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir },
    },
  },

  // Next.js + React hooks rules for UI surfaces.
  {
    files: ['src/app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    plugins: { '@next/next': nextPlugin, 'react-hooks': reactHooks },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Next route handlers and server components are async by convention.
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/require-await': 'off' },
  },

  // Layering rules (route -> service -> repository -> db; client never touches server).
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [serverOnlyFromClient] }],
    },
  },
  {
    files: ['src/app/**/route.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/server/repositories', '@/server/repositories/*'],
              message:
                'Route handlers must go through @/server/services, not repositories directly.',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/server/services/**/*.ts', 'src/server/repositories/**/*.ts'],
    ignores: ['**/*.test.ts', '**/*.integration.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['next', 'next/*', '@/app/*', '@/components/*'],
              message:
                'Server domain code must not import Next.js, route handlers, or UI components.',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },

  // Tests lean on mocks and casts; relax the noisiest type-aware rules.
  {
    files: ['**/*.test.{ts,tsx}', '**/*.integration.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/await-thenable': 'off',
    },
  },

  // Root config files (next.config.ts, drizzle.config.ts, vitest.config.ts,
  // eslint.config.mjs): TypeScript parser + syntactic rules, no type-aware linting.
  {
    files: ['*.{ts,mjs,js}'],
    extends: [...tseslint.configs.recommended],
    languageOptions: { globals: { ...globals.node } },
  },

  prettier,
)
