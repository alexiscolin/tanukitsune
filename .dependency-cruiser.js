/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: 'core-imports-nothing',
      comment: 'core/ is pure. It declares ports and never imports an implementation.',
      severity: 'error',
      from: { path: '^src/core/' },
      to: { path: '^src/(data|ai|app|ui)/' },
    },
    {
      name: 'ui-imports-no-io',
      comment: 'ui/ renders. Data access and model calls reach it as props.',
      severity: 'error',
      from: { path: '^src/ui/' },
      // Reachable, not adjacent: ui -> app -> data is the same leak by one more hop.
      to: { path: '^src/(data|ai)/', reachable: true },
    },
    {
      name: 'ui-imports-nothing-server-only',
      comment: 'A module that imports server-only must never be reachable from ui/.',
      severity: 'error',
      from: { path: '^src/ui/' },
      // Matched on the resolved path. The package resolves inside node_modules,
      // so a bare '^server-only$' matches nothing and the gate guards nothing.
      to: { path: 'node_modules/server-only/', reachable: true },
    },
    {
      name: 'no-cycles',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      comment: 'A module with no dependents and no dependencies. knip covers the general unused-export case.',
      severity: 'error',
      from: { orphan: true, pathNot: ['\\.d\\.ts$', '^src/app/'] },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'require', 'node', 'default'] },
    reporterOptions: { text: { highlightFocused: true } },
  },
}
