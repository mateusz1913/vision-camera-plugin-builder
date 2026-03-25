import tsEslintPlugin from '@typescript-eslint/eslint-plugin';
import tsEslintParser from '@typescript-eslint/parser';
import { defineConfig } from 'eslint/config';
import pluginImport from 'eslint-plugin-import';

export default defineConfig([
  {
    ignores: [
      'node_modules/',
      'build/',
    ],
  },
  {
    files: [ 'src/**/*.ts', 'test/**/*.ts', 'types-definitions/**/*.d.ts' ],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
      parser: tsEslintParser,
    },
    plugins: {
      '@typescript-eslint': tsEslintPlugin,
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
  {
    plugins: {
      import: pluginImport,
    },
    rules: {
      'import/order': [
        'error',
        {
          'groups': [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          'alphabetize': { order: 'asc' },
        },
      ],
    },
  },
  {
    rules: {   
      'max-len': [
        'error',
        {
          code: 120,
          ignoreComments: true,
          ignoreRegExpLiterals: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreTrailingComments: true,
          tabWidth: 2,
        },
      ],
      'no-underscore-dangle': 'error',
      'no-unused-vars': 'off',
      'sort-imports': [
        'error',
        {
          ignoreCase: false,
          ignoreDeclarationSort: true,
          ignoreMemberSort: false,
          memberSyntaxSortOrder: [ 'none', 'all', 'multiple', 'single' ],
        },
      ],
      'object-curly-spacing': [ 'error', 'always', { arraysInObjects: false, objectsInObjects: false }],
      'array-bracket-spacing': [ 'error', 'always', { objectsInArrays: false, arraysInArrays: false }],
      'no-extra-parens': [ 'error', 'all' ],
      'arrow-parens': [ 'error', 'always' ],
      'semi': [ 'error', 'always' ],
      'comma-dangle': [ 'error', 'always-multiline' ],
      'quotes': [ 'error', 'single' ],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: 'const', next: '*' },
        { blankLine: 'any', prev: 'const', next: 'const' },
        { blankLine: 'always', prev: 'function', next: '*' },
        { blankLine: 'always', prev: 'block-like', next: '*' },
      ],
      'quote-props': [ 'error', 'consistent-as-needed' ],
    },
  },
  {
    files: [ 'eslint.config.mjs' ],
    rules: {
      'import/no-extraneous-dependencies': 'off',
    },
  },
  {
    files: [ 'test/**/*.spec.*' ],
    languageOptions: {
      globals: {
        jest: true,
      },
    },
  },
]);
