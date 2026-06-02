module.exports = function (api) {
  api.cache(true)

  const isTest = process.env.NODE_ENV === 'test'

  return {
    presets: [
      'babel-preset-expo',
      // NativeWind/babel is a preset (returns { plugins }), not a plugin
      ...(!isTest ? ['nativewind/babel'] : []),
    ],
    plugins: [
      ['module-resolver', { alias: { '@': './src' } }],
      'react-native-reanimated/plugin',
    ],
  }
}
