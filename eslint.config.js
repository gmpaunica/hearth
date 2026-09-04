// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
    // This legacy, non-canonical client uses imperative R3F animation objects,
    // PanResponder refs, and external scene state. The React Compiler rules do
    // not model those APIs; keep the standard hooks rules while avoiding false
    // errors until the scene is retired from this backend-only checkout.
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["supabase/functions/**/*.ts"],
    // Supabase Edge Functions resolve URL imports in Deno, not through Node.
    rules: {
      "import/no-unresolved": "off",
    },
  }
]);
