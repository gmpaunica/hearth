import fs from 'node:fs';
import path from 'node:path';
import { repositoryRoot, run } from './lib.mjs';

const root = repositoryRoot();
const testsRoot = path.join(root, 'tests');

function collect(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return collect(full);
    return entry.isFile() && entry.name.endsWith('.test.mjs') ? [full] : [];
  });
}

const tests = collect(testsRoot).sort((a, b) => a.localeCompare(b));
if (tests.length === 0) throw new Error('No tests/*.test.mjs files were found.');
process.stdout.write(`Running ${tests.length} test files.\n`);
run(process.execPath, ['--test', ...tests], { cwd: root, stdio: 'inherit' });
