// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["src/scene/**/*.{ts,tsx}", "src/character/CharacterViewport.tsx"],
    rules: {
      // React Three Fiber intentionally exposes Three.js fields as JSX props.
      "react/no-unknown-property": "off",
    },
  },
]);
