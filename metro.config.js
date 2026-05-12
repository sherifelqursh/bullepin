const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Firebase v12 uses package "exports" with `browser` + `node` conditions
// but no `react-native` condition. Enable package exports and force Metro
// to evaluate the `browser` branch on native — that branch's `require`
// entry points at a CJS bundle Metro can handle.
// See https://github.com/firebase/firebase-js-sdk/issues/8587
config.resolver.sourceExts.push("cjs");
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ["require", "react-native", "browser"];

module.exports = withNativeWind(config, { input: "./global.css" });
