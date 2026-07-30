// eslint-config-next crashes this linter version, so its plugins are taken directly.
import next from '@next/eslint-plugin-next'
import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // The boundary probes are excluded from tsconfig, so `projectService` would refuse
  // to parse one for as long as it exists. scripts/check-boundaries.sh asserts this
  // glob and the tsconfig one together, since a rename breaks each differently.
  { ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'next-env.d.ts', 'src/**/__boundary-probe-*.ts'] },

  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  reactHooks.configs.flat['recommended-latest'],

  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { '@next/next': next },
    // Every rule to error: half ship as warnings, and a warning is reported as passing.
    rules: Object.fromEntries(
      Object.keys({ ...next.configs.recommended.rules, ...next.configs['core-web-vitals'].rules }).map(
        (rule) => [rule, 'error'],
      ),
    ),
  },

  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'no-console': 'error',
      // AGENTS.md refuses anything provisional at merge. A marker naming later work
      // is a backlog entry, so the rule points at the file that holds them.
      'no-warning-comments': ['error', { terms: ['todo', 'fixme', 'hack', 'xxx'], location: 'anywhere' }],

      complexity: ['error', 15],
      'max-lines': ['error', 400],
      'max-lines-per-function': ['error', 120],
      'max-depth': ['error', 4],
      'max-params': ['error', 4],
    },
  },

  {
    // src/data/env.ts states that nothing else in the application reads the
    // environment. Stating it is not enforcing it. Configuration and tests run
    // outside the application and are not covered.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/data/env.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'process', property: 'env', message: 'Read the environment through src/data/env.ts.' },
      ],
    },
  },

  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
    },
  },

  {
    files: ['*.config.{js,mjs,ts}', '.dependency-cruiser.js'],
    ...tseslint.configs.disableTypeChecked,
  },
)
