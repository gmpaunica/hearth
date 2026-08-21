import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testsRoot = path.join(root, 'tests');

function collect(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collect(fullPath);
    return entry.isFile() && entry.name.endsWith('.test.mjs') ? [fullPath] : [];
  });
}

const tests = collect(testsRoot).sort((left, right) => left.localeCompare(right));
if (tests.length === 0) throw new Error('No tests/*.test.mjs files were found.');

process.stdout.write(`Running ${tests.length} test files.\n`);
const result = spawnSync(process.execPath, ['--test', ...tests], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
