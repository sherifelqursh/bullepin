module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Reanimated 4 / SDK 54 requires the worklets plugin to be last.
    plugins: ["react-native-worklets/plugin"],
  };
};
