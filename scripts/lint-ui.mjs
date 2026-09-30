// Checks the architecture rules of @c-code/c-code-fw/ui (see .claude/rules/ui-components.md).
// Usage: npm run lint:ui
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const uiSrc = join(root, 'projects/core/ui/src');

const ALLOWED = [
  /^@angular\/core(\/|$)/,
  /^@angular\/common(\/|$)/,
  /^@angular\/router(\/|$)/,
  /^@angular\/platform-browser(\/|$)/,
  /^rxjs(\/|$)/,
  /^\./,
];
const DOMAIN_DIRS = ['lib/models', 'lib/utils'];

const errors = [];
const rel = (file) => relative(root, file).replace(/\\/g, '/');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(uiSrc).filter((f) => f.endsWith('.ts'));

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const isSpec = file.endsWith('.spec.ts');
  const inDomain = DOMAIN_DIRS.some((d) => rel(file).includes(`/ui/src/${d}/`));
  const imports = [...source.matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map(
    (m) => m[1] ?? m[2]
  );

  for (const spec of imports) {
    if (!ALLOWED.some((re) => re.test(spec))) {
      errors.push(`${rel(file)}: external dependency "${spec}" is not allowed.`);
    }
    if (inDomain && !isSpec && !spec.startsWith('.')) {
      errors.push(`${rel(file)}: domain code (models/utils) must not import "${spec}".`);
    }
  }

  if (file.endsWith('.component.ts')) {
    if (/^\s*template\s*:/m.test(source)) errors.push(`${rel(file)}: use templateUrl, not an inline template.`);
    if (/^\s*styles\s*:/m.test(source)) errors.push(`${rel(file)}: use styleUrl, not inline styles.`);

    const base = basename(file, '.ts');
    for (const ext of ['.html', '.css']) {
      if (!existsSync(join(dirname(file), base + ext))) {
        errors.push(`${rel(file)}: missing ${base}${ext}.`);
      }
    }

    // Every component resolves the shared tokens first.
    const styleUrls = source.match(/styleUrls:\s*\[([^\]]*)\]/);
    if (!styleUrls || !/^\s*'\.\.\/\.\.\/theme\/component-base\.css'/.test(styleUrls[1])) {
      errors.push(`${rel(file)}: styleUrls must start with '../../theme/component-base.css'.`);
    }

    // Colors come from roles, never from hex values in the component.
    const cssFile = join(dirname(file), base + '.css');
    if (existsSync(cssFile)) {
      for (const m of readFileSync(cssFile, 'utf8').matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
        errors.push(`${rel(cssFile)}: hex color ${m[0]}; use a role variable such as var(--_accent).`);
      }
    }
  }
}

if (errors.length) {
  console.error(`lint:ui found ${errors.length} problem(s):\n` + errors.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}
console.log(`lint:ui OK (${files.length} files checked).`);
