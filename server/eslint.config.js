import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['coverage'] },
  {
    files: ['src/**/*.js', 'test/**/*.js'],
    ...js.configs.recommended,
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: globals.node },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
];
