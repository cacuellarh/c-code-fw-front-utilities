// Builds the npm package @c-code/content: the `c-code-content` command that the sites run
// before their build to bring their content from Firestore.
// Usage: npm run build:content   →   dist/content (publish with: cd dist/content && npm publish --access public)
import { build } from 'esbuild';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist/content');
const version = JSON.parse(readFileSync(join(root, 'projects/cms/content.version.json'), 'utf8')).version;

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'bin'), { recursive: true });

await build({
  entryPoints: [join(root, 'projects/cms/src/cli/main.ts')],
  outfile: join(out, 'bin/c-code-content.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  banner: { js: '#!/usr/bin/env node' },
  alias: { '@cc/ui-domain': join(root, 'projects/core/ui/src/domain.ts') },
  legalComments: 'none',
  logLevel: 'warning',
});

writeFileSync(
  join(out, 'package.json'),
  JSON.stringify(
    {
      name: '@c-code/content',
      version,
      description: 'Trae el contenido de un sitio desde el CMS de C-Code (Firestore) antes del build.',
      type: 'module',
      bin: { 'c-code-content': 'bin/c-code-content.mjs' },
      files: ['bin'],
      engines: { node: '>=18' },
      license: 'MIT',
      repository: { type: 'git', url: 'https://github.com/cacuellarh/c-code-fw-front-utilities' },
    },
    null,
    2
  ) + '\n'
);

writeFileSync(
  join(out, 'README.md'),
  `# @c-code/content

Brings a site's content from the C-Code CMS (Firestore) into its folder before the build.

\`\`\`json
"scripts": {
  "content": "c-code-content pull --site xora-spa --project c-code-bf1fd",
  "prebuild": "npm run content",
  "prestart": "npm run content"
}
\`\`\`

- **Writes:** the JSON files of each collection, plus the files the site's scope generates (\`prerender-routes.txt\`, \`sitemap.xml\`).
- **Reads:** Firestore's public REST API, so it needs no credentials.
- **Fails:** if Firestore cannot be read. The build then stops, and the last published version stays online.
`
);

console.log(`dist/content listo (@c-code/content@${version})`);
