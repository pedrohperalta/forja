import expoConfig from 'eslint-config-expo/flat.js'

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...expoConfig,
  {
    ignores: ['node_modules/', 'dist/', '.expo/', 'ios/', 'android/'],
  },
]
