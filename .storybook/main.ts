import type { StorybookConfig } from '@storybook/nextjs-vite'

// Why the catalogue stops at src/ui/: docs/decisions/0009-storybook-as-the-review-surface.md.
const config: StorybookConfig = {
  framework: '@storybook/nextjs-vite',
  stories: ['../src/ui/**/*.stories.tsx'],
  addons: ['@storybook/addon-a11y'],
  // A product that asks for no account does not report to a third party from a
  // contributor's machine either.
  core: { disableTelemetry: true },
}

export default config
