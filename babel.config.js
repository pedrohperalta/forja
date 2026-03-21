module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', { alias: { '@': './src' } }],
      'nativewind/babel',
      'babel-plugin-react-compiler',
      'react-native-reanimated/plugin',
    ],
  }
}
