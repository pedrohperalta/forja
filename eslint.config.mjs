import expoConfig from 'eslint-config-expo/flat.js'

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...expoConfig,
  {
    ignores: ['node_modules/', 'dist/', '.expo/', 'ios/', 'android/', 'supabase/'],
  },
  {
    files: ['tailwind.config.ts', 'metro.config.js', 'babel.config.js', 'commitlint.config.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]
