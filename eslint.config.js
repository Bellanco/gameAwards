import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/**
 * Configuración de ESLint (flat config, ESLint 9).
 * Cubre React + hooks + accesibilidad (jsx-a11y). Prettier va al final para
 * desactivar reglas de formato que gestiona Prettier.
 */
export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },

  js.configs.recommended,

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      // Vite + React 17+: no hace falta importar React en cada archivo.
      'react/react-in-jsx-scope': 'off',
      // No usamos prop-types (ver mejoras pendientes: migración a TS/PropTypes).
      'react/prop-types': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Regla nueva de eslint-plugin-react-hooks 7 (reglas del React Compiler).
      //
      // La marcan los 11 hooks y pantallas que CARGAN datos en un efecto y
      // guardan el resultado en estado (useFirestoreCategories, useAuthSession,
      // useSeasonResults…). Es el patrón estándar sin Suspense y funciona
      // correctamente; quitarlo exigiría rediseñar la carga de datos entera
      // (useSyncExternalStore o Suspense), que es un trabajo aparte.
      //
      // Queda como AVISO para no perderlo de vista, en lugar de como error que
      // tumbe el CI o de un `eslint-disable` repartido por once archivos.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },

  // Globals de Vitest en los tests.
  {
    files: ['**/*.test.{js,jsx}', 'src/test/**'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },

  prettier,
];
