// Checks the file layout of the CMS components (see .claude/rules/cms-architecture.md).
// What each layer may import or use is checked by npm run lint:domain, lint:eslint and lint:deps.
// Usage: npm run lint:cms
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shellUi = join(root, 'projects/cms/src/shell/ui');

const errors = [];
const rel = (file) => relative(root, file).replace(/\\/g, '/');
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

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
