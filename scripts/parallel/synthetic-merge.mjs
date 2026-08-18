import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { git, loadPolicy, repositoryRoot, run } from './lib.mjs';
import { assertGhAuth, ghJson } from './github.mjs';

function option(name, required = false) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : null;
  if (required && !value) throw new Error(`${name} is required.`);
  return value;
}

const root = repositoryRoot();
const policy = loadPolicy(root);
const pr = Number(option('--pr', true));
if (!Number.isInteger(pr) || pr < 1) throw new Error('--pr must be a positive integer.');
assertGhAuth();
if (git(['branch', '--show-current'], { cwd: root }) !== policy.integration_branch) {
  throw new Error(`Synthetic integration must start on ${policy.integration_branch}.`);
}
if (git(['status', '--porcelain'], { cwd: root })) throw new Error('Canonical checkout must be clean.');

const pull = ghJson(['pr', 'view', String(pr), '--json', 'headRefName,headRefOid,title,url']);
git(['fetch', 'origin', policy.integration_branch], { cwd: root, stdio: 'inherit' });
const commonValue = git(['rev-parse', '--git-common-dir'], { cwd: root });
const common = path.isAbsolute(commonValue) ? commonValue : path.resolve(root, commonValue);
const syntheticRoot = path.resolve(common, 'hearth-synthetic');
const temporary = path.resolve(syntheticRoot, `pr-${pr}-${crypto.randomUUID()}`);
if (!`${temporary}${path.sep}`.startsWith(`${syntheticRoot}${path.sep}`)) throw new Error('Unsafe synthetic path.');
const ref = `refs/hearth/pr-${pr}-${crypto.randomUUID()}`;
let added = false;

try {
  git(['fetch', 'origin', `pull/${pr}/head:${ref}`], { cwd: root, stdio: 'inherit' });
  fs.mkdirSync(syntheticRoot, { recursive: true });
  git(['worktree', 'add', '--detach', temporary, `origin/${policy.integration_branch}`], { cwd: root, stdio: 'inherit' });
  added = true;
  const merge = git(['merge', '--no-commit', '--no-ff', ref], { cwd: temporary, allowFailure: true });
  const conflicts = git(['diff', '--name-only', '--diff-filter=U'], { cwd: temporary })
    .split(/\r?\n/)
    .filter(Boolean);
  if (conflicts.length) {
    process.stderr.write(`${JSON.stringify({ status: 'conflict', pr, conflicts }, null, 2)}\n`);
    process.exitCode = 2;
  } else {
    const mergeHead = git(['rev-parse', '--verify', '-q', 'MERGE_HEAD'], {
      cwd: temporary,
      allowFailure: true,
    });
    if (!mergeHead) throw new Error('Synthetic merge did not produce a merge result.');
    git(['diff', '--check'], { cwd: temporary });
    run('npm', ['ci'], { cwd: temporary, stdio: 'inherit' });
    run('npm', ['run', 'typecheck'], { cwd: temporary, stdio: 'inherit' });
    run('npm', ['test'], { cwd: temporary, stdio: 'inherit' });
    run('npm', ['run', 'lint:changed', '--', '--base', `origin/${policy.integration_branch}`], {
      cwd: temporary,
      stdio: 'inherit',
    });
    run('npm', ['run', 'export:all'], { cwd: temporary, stdio: 'inherit' });
    const tree = git(['write-tree'], { cwd: temporary });
    process.stdout.write(`${JSON.stringify({ status: 'validated', pr, title: pull.title, head: pull.headRefOid, tree }, null, 2)}\n`);
  }
} finally {
  let cleanupFailure = null;
  if (added) {
    git(['worktree', 'remove', '--force', temporary], { cwd: root, allowFailure: true });
    if (fs.existsSync(temporary)) {
      cleanupFailure = `Git could not remove disposable worktree ${temporary}; inspect it manually.`;
    }
  }
  git(['update-ref', '-d', ref], { cwd: root, allowFailure: true });
  if (cleanupFailure) throw new Error(cleanupFailure);
}
