// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/**", "supabase/functions/**"],
  },
  {
    rules: {
      // El resolvedor de ESLint no interpreta el campo exports de esta dependencia móvil.
      'import/no-unresolved': ['error', { ignore: ['^react-native-chart-kit$'] }],
    },
  }
]);
