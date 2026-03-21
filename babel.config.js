module.exports = function (api) {
  api.cache(true)

  const isTest = process.env.NODE_ENV === 'test'

  const plugins = [['module-resolver', { alias: { '@': './src' } }]]

  // NativeWind and React Compiler babel plugins are not compatible
  // with Jest's Babel pipeline; only enable them outside of tests.
  if (!isTest) {
    plugins.push('nativewind/babel')
    plugins.push('babel-plugin-react-compiler')
  }

  // Reanimated plugin must be last
  plugins.push('react-native-reanimated/plugin')

  return {
    presets: ['babel-preset-expo'],
    plugins,
  }
}
