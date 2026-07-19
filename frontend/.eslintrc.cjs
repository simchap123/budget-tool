/* ESLint config for the Budget Tool frontend (ESLint 8 legacy format). */
module.exports = {
  root: true,
  env: { browser: true, es2021: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules', 'vite.config.ts', '*.cjs'],
  rules: {
    // This codebase intentionally uses `any` for PocketBase JSON payloads.
    '@typescript-eslint/no-explicit-any': 'off',
    // Flag genuinely unused symbols; allow intentional _-prefixed ones.
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    // Rules of Hooks is a real correctness rule — keep it on.
    'react-hooks/rules-of-hooks': 'error',
    // Data-fetch functions are defined in-component and called from effects;
    // exhaustive-deps would flood warnings without changing behavior.
    'react-hooks/exhaustive-deps': 'off',
  },
}
