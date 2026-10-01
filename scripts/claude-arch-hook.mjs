// Claude Code PostToolUse hook (see .claude/settings.json): after an agent edits a .ts file
// under projects/, lints it against the architecture rules (eslint.config.mjs). When the file
// belongs to a pure layer it also type-checks the domain without DOM or Node
// (projects/cms/tsconfig.domain.json). Exit 2 sends the errors back to the agent to fix.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const filePath = input.tool_input?.file_path ?? input.tool_response?.filePath;
if (!filePath) process.exit(0);

const file = relative(root, filePath).replace(/\\/g, '/');
if (!/^projects\/.+\.ts$/.test(file) || file.startsWith('projects/c-code-api-base/')) process.exit(0);

const problems = [];

const eslint = new ESLint({ cwd: root });
const results = await eslint.lintFiles([file]);
if (results.some((r) => r.errorCount > 0)) {
  const formatter = await eslint.loadFormatter('stylish');
  problems.push(await formatter.format(results));
}

const PURE = /^projects\/(cms\/src\/domain\/|core\/ui\/src\/(domain\.ts$|lib\/(models|utils)\/))/;
if (PURE.test(file) && !file.endsWith('.spec.ts')) {
  const tsc = spawnSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', 'projects/cms/tsconfig.domain.json'], {
    cwd: root,
    encoding: 'utf8',
  });
  if (tsc.status !== 0) {
    problems.push(
      'The domain must compile without DOM or Node (projects/cms/tsconfig.domain.json). ' +
        'Allowed platform APIs are listed in projects/cms/domain-platform.d.ts; anything else goes behind a port in domain/ports.ts.\n' +
        tsc.stdout
    );
  }
}

if (problems.length) {
  console.error(`Architecture check failed for ${file} (see .claude/rules/cms-architecture.md):\n${problems.join('\n')}`);
  process.exit(2);
}
