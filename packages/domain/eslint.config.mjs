import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import globals from 'globals'
import tseslint from 'typescript-eslint'

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url))

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/'] },

  // Type-checked linting for library source (tests are excluded from tsconfig).
  {
    files: ['src/**/*.ts'],
    ignores: ['**/*.test.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir },
    },
  },

  // Tests: syntactic rules only (not part of the build tsconfig).
  {
    files: ['**/*.test.ts'],
    extends: [...tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },

  {
    files: ['*.{ts,mjs,js}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: { ...globals.node } },
  },
)
