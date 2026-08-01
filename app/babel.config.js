module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Required by react-native-reanimated 4 (used by the drawer navigator); must stay last.
    plugins: ['react-native-worklets/plugin'],
  };
};
