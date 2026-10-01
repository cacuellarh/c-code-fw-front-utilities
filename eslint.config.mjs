// Architecture lint (see .claude/rules/cms-architecture.md and .claude/rules/ui-components.md).
// Usage: npm run lint:eslint
//
// The rules here are about boundaries, not style: what each layer may import and declare.
// Two layers must stay pure TypeScript, with no framework, browser or Node:
//   - cms-domain: projects/cms/src/domain
//   - ui-domain:  the framework-free part of the UI library (domain.ts, lib/models, lib/utils)
// tsconfig.domain.json backs this up at the type level (no DOM, no @types/node).
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';

const DOMAIN = ['projects/cms/src/domain/**/*.ts'];
const UI_DOMAIN = ['projects/core/ui/src/domain.ts', 'projects/core/ui/src/lib/models/**/*.ts', 'projects/core/ui/src/lib/utils/**/*.ts'];
const CLI = ['projects/cms/src/cli/**/*.ts'];
const SPECS = ['**/*.spec.ts'];

const DOMAIN_HINT = 'When the domain needs something from outside, declare an interface in domain/ports.ts and let the shell implement it.';

/**
 * Globals that only exist in a browser or in Node. TypeScript also rejects them through tsconfig.domain.json.
 * The portable ones the domain may use (Blob, URL, structuredClone, atob) are listed in projects/cms/domain-platform.d.ts.
 */
const IMPURE_GLOBALS = [
  'window', 'document', 'navigator', 'location', 'history', 'localStorage', 'sessionStorage', 'indexedDB',
  'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'Worker', 'BroadcastChannel',
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'requestAnimationFrame', 'queueMicrotask',
  'alert', 'confirm', 'prompt', 'console',
  'crypto', 'performance', 'File', 'FileReader', 'Image', 'HTMLElement', 'OffscreenCanvas',
  'createImageBitmap', 'showDirectoryPicker', 'caches',
  'process', 'Buffer', 'global', '__dirname', '__filename', 'module', 'exports',
].map((name) => ({ name, message: `The domain is pure TypeScript and must not use "${name}". ${DOMAIN_HINT}` }));

/** Declarations that would let a pure layer reach outside of itself. */
const IMPURE_SYNTAX = [
  { selector: 'TSModuleDeclaration[kind="global"]', message: 'The domain must not declare globals (declare global). ' + DOMAIN_HINT },
  { selector: 'TSModuleDeclaration[declare=true][kind!="global"]', message: 'The domain must not declare ambient modules or namespaces (declare module/namespace).' },
  { selector: 'VariableDeclaration[declare=true]', message: 'The domain must not declare ambient variables (declare const/let/var).' },
  { selector: 'FunctionDeclaration[declare=true], TSDeclareFunction[declare=true]', message: 'The domain must not declare ambient functions (declare function).' },
  { selector: 'ClassDeclaration[declare=true]', message: 'The domain must not declare ambient classes (declare class).' },
  { selector: 'TSImportEqualsDeclaration', message: 'The domain must not use "import x = require(...)".' },
  { selector: 'ImportExpression', message: 'The domain must not use dynamic import(); it loads code at runtime, which belongs in the shell.' },
  { selector: 'MemberExpression[object.name="globalThis"]', message: 'The domain must not reach the platform through globalThis. ' + DOMAIN_HINT },
];

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '.angular/**', 'projects/c-code-api-base/**'] },
  {
    files: ['projects/**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: {
          noWarnOnMultipleProjects: true,
          project: ['projects/cms/tsconfig.spec.json', 'projects/cms/tsconfig.cli.json', 'projects/core/tsconfig.lib.json'],
        },
      },
      'boundaries/dependency-nodes': ['import', 'export', 'dynamic-import', 'require'],
      // Patterns match folders. The first descriptor that matches wins, so the narrow ones go first.
      'boundaries/elements': [
        { type: 'cms-domain', pattern: 'projects/cms/src/domain' },
        { type: 'cms-cli', pattern: 'projects/cms/src/cli' },
        { type: 'cms-shell', pattern: 'projects/cms/src' },
        { type: 'ui-domain', pattern: ['projects/core/ui/src/lib/models', 'projects/core/ui/src/lib/utils'] },
        { type: 'ui-lib', pattern: 'projects/core' },
      ],
    },
    rules: {
      // Every import of a file outside the known layers is suspicious: it must be classified first.
      'boundaries/no-unknown-dependencies': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',
          checkAllOrigins: true,
          checkUnknownLocals: true,
          policies: [
            {
              from: { element: { type: 'cms-domain' } },
              disallow: [
                { to: { element: { type: ['cms-shell', 'cms-cli'] } } },
                // @cc/ui-domain resolves to ui/src/domain.ts, the framework-free barrel of the UI library.
                { to: { element: { type: 'ui-lib', fileInternalPath: '!ui/src/domain.ts' } } },
                { to: { module: { origin: ['external', 'core'] } } },
              ],
              message: `The CMS domain (domain/) may only import other files in domain/ and @cc/ui-domain. ${DOMAIN_HINT}`,
            },
            {
              from: { element: { type: 'ui-domain' } },
              disallow: [
                { to: { element: { type: ['cms-domain', 'cms-shell', 'cms-cli', 'ui-lib'] } } },
                { to: { module: { origin: ['external', 'core'] } } },
              ],
              message: 'The framework-free part of the UI library (domain.ts, lib/models, lib/utils) may only import itself: no Angular, no components, no packages.',
            },
            {
              from: { element: { type: 'cms-cli' } },
              disallow: [{ to: { element: { type: ['cms-shell', 'ui-lib'] } } }, { to: { module: { origin: 'external' } } }],
              message: 'The build command (cli/) may only import domain/ and node: built-ins; not the browser shell, Angular or Firebase.',
            },
            {
              from: { element: { type: ['cms-shell', 'ui-lib'] } },
              disallow: { to: { element: { type: 'cms-cli' } } },
              message: 'Only the build command imports cli/.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [...DOMAIN, ...UI_DOMAIN],
    ignores: SPECS,
    rules: {
      'no-restricted-globals': ['error', ...IMPURE_GLOBALS],
      'no-restricted-syntax': ['error', ...IMPURE_SYNTAX],
    },
  },
  {
    // Specs of a pure layer may use Angular's test helpers, never the platform.
    files: ['projects/cms/src/domain/**/*.spec.ts', 'projects/core/ui/src/lib/{models,utils}/**/*.spec.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...IMPURE_SYNTAX],
    },
  },
  {
    files: ['projects/**/*.ts'],
    rules: {
      // /// <reference types="node" /> would bring Node's globals into a file without importing anything.
      '@typescript-eslint/triple-slash-reference': ['error', { path: 'never', types: 'never', lib: 'never' }],
    },
    plugins: { '@typescript-eslint': tseslint.plugin },
  },
  {
    files: CLI,
    rules: {
      'no-restricted-globals': [
        'error',
        ...['window', 'document', 'localStorage', 'sessionStorage', 'indexedDB', 'navigator'].map((name) => ({
          name,
          message: `The build command runs in Node; "${name}" does not exist there.`,
        })),
      ],
    },
  },
);
