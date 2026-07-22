module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-reanimated (v4 → react-native-worklets) requires its plugin,
    // and it must be listed last. Harmless when no worklets are present; needed
    // so a native build doesn't crash if anything pulls reanimated in.
    plugins: ['react-native-worklets/plugin'],
  };
};
