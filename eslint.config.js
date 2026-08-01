// eslint-config-next crashes this linter version, so its plugins are taken directly.
import next from '@next/eslint-plugin-next'
import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

// A Tailwind arbitrary value that spends no token, in both syntaxes: a bracket after a
// utility, as in p-[13px], and a bracket standing on its own and naming the property, as
// in [color:#ff0000], which is the shortest way to write a raw colour and carries no
// utility to key on.
//
// Two shapes fall outside it. A bracket carrying var(-- anywhere inside spends a token by
// name, so calc over one passes as the bare reference does. And a bracket followed by a
// colon is a variant, which selects rather than spending: the theme is an attribute on the
// root element, so data-[theme=dark] is a class this interface will write.
const ARBITRARY_VALUE = String.raw`(?:[a-z][a-z0-9:-]*-\[|(?:^|\s)\[(?=[^\]\s]*:))(?![^\]]*var\(--)[^\]]*\](?!:)`
const SPEND_A_TOKEN =
  'Arbitrary value. Spend a token from src/app/globals.css, as text-[var(--color-ink)] does.'

export default tseslint.config(
  // `eslint .` walks from the repository root, and a worktree is a second checkout
  // living inside it, so without this the gate reports another branch's work in
  // progress as this branch's failure. `check-docs.sh` skips the same directory for
  // the same reason; `depcruise`, `jscpd`, `knip`, `vitest` and `tsc` are all scoped
  // to `src` or to an include list and never reach it.
  //
  // The boundary probes are excluded from tsconfig, so `projectService` would refuse
  // to parse one for as long as it exists. scripts/check-boundaries.sh asserts this
  // glob and the tsconfig one together, since a rename breaks each differently.
  {
    ignores: [
      '.next/**',
      'storybook-static/**',
      'node_modules/**',
      'coverage/**',
      'next-env.d.ts',
      '.claude/worktrees/**',
      'src/**/__boundary-probe-*.ts',
    ],
  },

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
    // src/app/globals.css declares itself the single token source. A Tailwind arbitrary
    // value is the one way to spend a colour or a length that never passed through it,
    // and it is how a generated component arrives carrying its own scale.
    //
    // Every string rather than class attributes alone, because classes are held in module
    // constants in src/ui/organisms/review-session.tsx and an attribute-scoped rule would pass a
    // constant holding one. A template counts for the same reason a constant does.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: `:matches(Literal[value=/${ARBITRARY_VALUE}/], TemplateElement[value.raw=/${ARBITRARY_VALUE}/])`,
          message: SPEND_A_TOKEN,
        },
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
