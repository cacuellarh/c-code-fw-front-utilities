// Dependency graph rules (see .claude/rules/cms-architecture.md).
// Usage: npm run lint:deps
//
// ESLint checks each import where it is written. This checks the whole graph: cycles, and
// whether a pure layer reaches something impure through another file (e.g. if
// @cc/ui-domain ever imported Angular, every domain file that uses it would break here).
const CMS_DOMAIN = '^projects/cms/src/domain/';
const UI_DOMAIN = '^projects/core/ui/src/(domain\\.ts$|lib/(models|utils)/)';
const PURE = `(${CMS_DOMAIN})|(${UI_DOMAIN})`;

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-only-imports-domain',
      comment: 'The CMS domain may only import domain/ and @cc/ui-domain. Put anything external behind a port (domain/ports.ts).',
      severity: 'error',
      from: { path: CMS_DOMAIN },
      to: { pathNot: PURE },
    },
    {
      name: 'ui-domain-only-imports-itself',
      comment: 'The framework-free part of the UI library (domain.ts, lib/models, lib/utils) may only import itself.',
      severity: 'error',
      from: { path: UI_DOMAIN },
      to: { pathNot: UI_DOMAIN },
    },
    {
      name: 'pure-layers-stay-pure-transitively',
      comment: 'Nothing a pure layer depends on, directly or not, may be a package or Node/browser built-in.',
      severity: 'error',
      from: { path: PURE },
      to: { reachable: true, path: '(^node_modules/)|(^projects/cms/src/(shell|cli)/)|(^projects/core/ui/src/lib/(components|services|theme)/)' },
    },
    {
      name: 'cli-only-domain-and-node',
      comment: 'The build command (cli/) may only import domain/ and node: built-ins.',
      severity: 'error',
      from: { path: '^projects/cms/src/cli/' },
      to: { pathNot: `(^projects/cms/src/cli/)|${PURE}`, dependencyTypesNot: ['core'] },
    },
    {
      name: 'only-cli-imports-cli',
      severity: 'error',
      from: { pathNot: '^projects/cms/src/cli/' },
      to: { path: '^projects/cms/src/cli/' },
    },
    {
      name: 'no-circular',
      comment: 'Circular dependencies make layers impossible to separate.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'not-to-unresolvable',
      comment: 'An import that cannot be resolved hides what a file really depends on.',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^dist/)|(^projects/c-code-api-base/)' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.depcruise.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
