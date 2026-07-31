import type { StorybookConfig } from '@storybook/nextjs-vite'

// Why the catalogue stops at src/ui/: docs/decisions/0009-storybook-as-the-review-surface.md.
const config: StorybookConfig = {
  framework: '@storybook/nextjs-vite',
  stories: ['../src/ui/**/*.stories.tsx'],
  addons: ['@storybook/addon-a11y'],
  // The catalogue is a development tool on a product that asks for no account and sends
  // nothing anywhere. A tool reporting to a third party from a contributor's machine is a
  // decision, and this is it, taken the other way.
  core: { disableTelemetry: true },
}

export default config
