import { git, loadPolicy, previewPublicationDecision, repositoryRoot, run } from './lib.mjs';

function option(name, required = false) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : null;
  if (required && !value) throw new Error(`${name} is required.`);
  return value;
}

function jsonFromOutput(output) {
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error(`EAS did not return JSON: ${output}`);
  return JSON.parse(output.slice(start, end + 1));
}

function list(policy, limit) {
  const output = run('npx', [
    'eas-cli', 'update:list', '--branch', policy.preview_branch,
    '--limit', String(limit), '--json', '--non-interactive',
  ]);
  return jsonFromOutput(output).currentPage ?? [];
}

const root = repositoryRoot();
const policy = loadPolicy(root);
const sha = option('--sha', true);
const pr = option('--pr', true);
const description = option('--message', true);
if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error('--sha must be a full Git SHA.');
if (git(['rev-parse', 'HEAD'], { cwd: root }) !== sha) {
  throw new Error(`Canonical HEAD must be exactly ${sha} before preview publication.`);
}
const marker = `[sha:${sha}]`;
const existing = list(policy, 50);
const decision = previewPublicationDecision(existing, sha);
if (decision.action === 'blocked-not-newest') {
  throw new Error(`Update for ${sha} exists but is not newest; refusing a duplicate publication.`);
}
if (decision.action === 'already-published') {
  process.stdout.write(`${JSON.stringify({ status: 'already-published', sha, group: existing[0].group })}\n`);
  process.exit(0);
}

const message = `${description} (PR #${pr}) ${marker}`;
run('npx', [
  'eas-cli', 'update', '--branch', policy.preview_branch,
  '--environment', policy.preview_environment, '--message', message, '--non-interactive',
], { cwd: root, stdio: 'inherit' });
const latest = list(policy, 1)[0];
if (!latest?.message?.includes(marker)) throw new Error(`Published update for ${sha} is not newest on ${policy.preview_branch}.`);
process.stdout.write(`${JSON.stringify({ status: 'published', sha, group: latest.group, runtime_version: latest.runtimeVersion })}\n`);
