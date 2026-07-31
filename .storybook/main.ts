import type { StorybookConfig } from '@storybook/nextjs-vite'

// Stories are limited to src/ui/, which is the boundary ADR 0009 draws: a Server Component
// renders here only behind an experimental flag that does not survive one reaching a
// database, and every one of ours does.
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
