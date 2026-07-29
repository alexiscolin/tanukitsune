import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

// Two projects rather than one DOM for everything: core/ is pure, and running it
// under jsdom would let a module there reach a browser global the layer forbids
// without a single test failing.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'core', include: ['src/**/*.test.ts'], environment: 'node' },
      },
      {
        extends: true,
        test: { name: 'ui', include: ['src/**/*.test.tsx'], environment: 'jsdom' },
      },
    ],
  },
})
