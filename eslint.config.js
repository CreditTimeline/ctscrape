import js from '@eslint/js';
import ts from 'typescript-eslint';

export default ts.config(js.configs.recommended, ...ts.configs.strict, {
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': 'error',
  },
  ignores: ['.output/', '.wxt/', 'node_modules/'],
});
