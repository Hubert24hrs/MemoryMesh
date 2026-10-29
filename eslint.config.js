// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Edge Functions run on Deno (npm:/jsr: specifiers); they are linted by `deno lint`.
    ignores: ['dist/*', 'coverage/*', 'supabase/functions/**', '!supabase/functions/_shared/router.ts'],
  },
]);
