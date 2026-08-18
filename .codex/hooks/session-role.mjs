import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function comparable(value) {
  return path.resolve(value).replaceAll('\\', '/').replace(/\/$/, '').toLowerCase();
}

try {
  const root = git(['rev-parse', '--show-toplevel']);
  const branch = git(['branch', '--show-current']) || '(detached)';
  const policy = JSON.parse(
    fs.readFileSync(path.join(root, '.codex', 'parallel-policy.json'), 'utf8'),
  );
  const canonical = comparable(policy.canonical_checkout);
  const current = comparable(root);

  if (current === canonical && branch === policy.integration_branch) {
    process.stdout.write(
      'HEARTH ROLE: protected integrator checkout. Use $hearth-integrator only for queue integration, shared-file requests, synchronization, and preview publication. Do not implement feature work directly here. Merges and EAS publication are serialized.\n',
    );
  } else if (current === canonical) {
    process.stdout.write(
      `HEARTH ROLE ERROR: the canonical checkout is on ${branch}, not ${policy.integration_branch}. Do not edit. Restore the protected integration branch before continuing.\n`,
    );
  } else {
    process.stdout.write(
      `HEARTH ROLE: isolated worker worktree (${branch}). Use $hearth-worker and create a GitHub reservation before editing. Stay inside the winning scope. Never merge, publish an EAS update, deploy a migration, or modify the canonical checkout.\n`,
    );
  }
} catch (error) {
  process.stderr.write(`Hearth session-role hook could not classify this checkout: ${error.message}\n`);
  process.exitCode = 1;
}
