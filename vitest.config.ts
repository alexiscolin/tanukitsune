import { defineConfig } from 'vitest/config'

// Two projects rather than one DOM for everything. A test of a component needs a
// document and a test of core/ must not have one: under jsdom, a pure module could
// reach a browser global the layer forbids without a single test failing. The line
// is drawn on the extension, which is the only thing a runner can see before it
// loads a file, and every component test is a .tsx by the framework's own rule.
export default defineConfig({
  resolve: {
    alias: { '@': `${import.meta.dirname}/src` },
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
