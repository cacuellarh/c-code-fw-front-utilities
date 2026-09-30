// Checks the architecture of the CMS (see .claude/rules/cms-architecture.md).
// Usage: npm run lint:cms
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'projects/cms/src');
const domain = join(src, 'domain');
const shellUi = join(src, 'shell/ui');

/** Packages the domain may import: only the framework-free part of the component library. */
const DOMAIN_PACKAGES = ['@cc/ui-domain'];
/** Browser and framework globals that belong in the shell. */
const BROWSER_GLOBALS =
  /\b(window|document|indexedDB|localStorage|sessionStorage|navigator|HTMLElement|FileSystem\w*Handle|showDirectoryPicker|createObjectURL|OffscreenCanvas|createImageBitmap)\b/;

const errors = [];
const rel = (file) => relative(root, file).replace(/\\/g, '/');
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const importsOf = (source) =>
  [...source.matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1] ?? m[2]);
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

for (const file of walk(domain).filter((f) => f.endsWith('.ts'))) {
  const source = readFileSync(file, 'utf8');
  const isSpec = file.endsWith('.spec.ts');
  for (const spec of importsOf(source)) {
    if (spec.startsWith('.')) {
      const target = resolve(dirname(file), spec);
      if (!target.startsWith(domain)) errors.push(`${rel(file)}: the domain must not import "${spec}" (outside domain/).`);
    } else if (!DOMAIN_PACKAGES.includes(spec) && !(isSpec && spec.startsWith('@angular/'))) {
      errors.push(`${rel(file)}: the domain must not import "${spec}". Only ${DOMAIN_PACKAGES.join(', ')} is allowed.`);
    }
  }
  if (!isSpec) {
    const code = stripComments(source);
    const match = BROWSER_GLOBALS.exec(code);
    if (match) errors.push(`${rel(file)}: the domain must not use "${match[1]}"; put it behind a port (domain/ports.ts).`);
  }
}

for (const file of walk(shellUi).filter((f) => /\.(component|page)\.ts$/.test(f))) {
  const source = readFileSync(file, 'utf8');
  if (/^\s*template\s*:/m.test(source)) errors.push(`${rel(file)}: use templateUrl, not an inline template.`);
  if (/^\s*styles\s*:/m.test(source)) errors.push(`${rel(file)}: use styleUrl, not inline styles.`);
  for (const ext of ['html', 'css']) {
    const sibling = file.replace(/\.ts$/, `.${ext}`);
    if (!existsSync(sibling)) errors.push(`${rel(file)}: missing ${rel(sibling)}.`);
  }
}

if (errors.length) {
  console.error(`lint:cms found ${errors.length} problem(s):\n` + errors.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}
console.log('lint:cms OK');
