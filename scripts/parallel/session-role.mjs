import fs from 'node:fs';
import path from 'node:path';
import { git, loadPolicy, repositoryRoot } from './lib.mjs';

const expectedIndex = process.argv.indexOf('--expect');
const expected = expectedIndex >= 0 ? process.argv[expectedIndex + 1] : null;
const root = repositoryRoot();
const policy = loadPolicy(root);
const comparable = (value) => path.resolve(value).replaceAll('\\', '/').replace(/\/$/, '').toLowerCase();
const canonical = comparable(root) === comparable(policy.canonical_checkout);
const branch = git(['branch', '--show-current'], { cwd: root }) || '(detached)';
const role = canonical && branch === policy.integration_branch ? 'integrator' : canonical ? 'invalid-canonical' : 'worker';
const dirty = git(['status', '--porcelain'], { cwd: root });

const result = { role, root, branch, clean: !dirty };
process.stdout.write(`${JSON.stringify(result)}\n`);

if (role === 'invalid-canonical') {
  process.stderr.write(`Canonical checkout must remain on ${policy.integration_branch}.\n`);
  process.exitCode = 2;
} else if (expected && role !== expected) {
  process.stderr.write(`Expected ${expected} role but detected ${role}.\n`);
  process.exitCode = 2;
} else if (expected === 'integrator' && dirty) {
  process.stderr.write('Canonical integration checkout must be clean before an integrator run.\n');
  process.exitCode = 2;
}
