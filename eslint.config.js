import js from '@eslint/js';
import ts from 'typescript-eslint';
import security from 'eslint-plugin-security';

export default ts.config(
  js.configs.recommended,
  ...ts.configs.strict,
  security.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['src/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    ignores: ['.output/', '.wxt/', 'node_modules/', 'coverage/'],
  },
);
