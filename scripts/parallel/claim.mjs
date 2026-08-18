import fs from 'node:fs';
import path from 'node:path';
import {
  anyScopeOverlap,
  claimMetadataPath,
  formatClaim,
  git,
  isIntegrationRequestOnly,
  isIntegratorOwned,
  loadPolicy,
  normalizeRepoPath,
  normalizeScope,
  parseClaim,
  repositoryRoot,
  scopesOverlap,
  writeJsonAtomic,
} from './lib.mjs';
import { assertGhAuth, gh, ghJson } from './github.mjs';

function argumentsOf(argv) {
  const values = new Map();
  const booleans = new Set(['native-impact', 'database-impact']);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    if (booleans.has(key)) {
      values.set(key, [true]);
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${token} needs a value.`);
    index += 1;
    values.set(key, [...(values.get(key) ?? []), value]);
  }
  return values;
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

const args = argumentsOf(process.argv.slice(2));
const taskId = slug(args.get('task-id')?.[0]);
const taskSlug = slug(args.get('slug')?.[0]);
if (!taskId || !taskSlug) throw new Error('Use --task-id <id> and --slug <short-name>.');

const root = repositoryRoot();
const policy = loadPolicy(root);
const comparable = (value) => path.resolve(value).replaceAll('\\', '/').replace(/\/$/, '').toLowerCase();
if (comparable(root) === comparable(policy.canonical_checkout)) {
  throw new Error('Claims must be created from an isolated Codex worktree, never the canonical checkout.');
}
if (git(['status', '--porcelain'], { cwd: root })) throw new Error('Worktree must be clean before creating a claim.');

const scopes = [
  ...(args.get('exact') ?? []).map((value) => normalizeScope({ kind: 'exact', path: value })),
  ...(args.get('prefix') ?? []).map((value) => normalizeScope({ kind: 'prefix', path: value })),
];
if (scopes.length === 0) throw new Error('Declare at least one --exact or --prefix write scope.');
for (const scope of scopes) {
  if (scope.kind === 'prefix' && policy.forbidden_worker_prefixes.includes(scope.path)) {
    throw new Error(`${scope.path} is too broad; reserve a narrower directory or exact files.`);
  }
  if (policy.integrator_owned.some((owned) => scopesOverlap(scope, owned))) {
    throw new Error(`${scope.path} overlaps an integrator-owned path. Use --request instead.`);
  }
  if (policy.integration_request_only.some((file) => scopesOverlap(scope, { kind: 'exact', path: file }))) {
    throw new Error(`${scope.path} overlaps an integration-request-only file. Use --request instead.`);
  }
}

const requests = (args.get('request') ?? []).map((value) => {
  const separator = value.indexOf('::');
  if (separator < 1) throw new Error(`Integration request must be <path>::<reason>: ${value}`);
  const request = {
    path: normalizeRepoPath(value.slice(0, separator)),
    reason: value.slice(separator + 2).trim(),
  };
  if (!request.reason) throw new Error(`Integration request needs a reason: ${request.path}`);
  if (!isIntegrationRequestOnly(policy, request.path) && !isIntegratorOwned(policy, request.path)) {
    throw new Error(`${request.path} is not integrator-owned; reserve it in write_scope instead.`);
  }
  return request;
});

assertGhAuth();
git(['fetch', 'origin', policy.integration_branch], { cwd: root, stdio: 'inherit' });
const baseSha = git(['rev-parse', `origin/${policy.integration_branch}`], { cwd: root });
const branch = `codex/${taskId}-${taskSlug}`;
if (!new RegExp(policy.worker_branch_pattern).test(branch)) throw new Error(`Invalid generated branch: ${branch}`);
const existingRef = git(['show-ref', '--verify', `refs/heads/${branch}`], { cwd: root, allowFailure: true });
if (existingRef) throw new Error(`Local branch already exists: ${branch}`);
git(['switch', '-c', branch, `origin/${policy.integration_branch}`], { cwd: root, stdio: 'inherit' });

gh([
  'label',
  'create',
  policy.claim_label,
  '--color',
  '1D76DB',
  '--description',
  'Automated Hearth parallel write reservation',
  '--force',
]);

const claim = {
  version: 1,
  task_id: taskId,
  slug: taskSlug,
  branch,
  base_sha: baseSha,
  write_scope: scopes,
  integration_requests: requests,
  native_impact: args.has('native-impact'),
  database_impact: args.has('database-impact'),
  dependencies: (args.get('depends-on') ?? []).map((value) => Number.parseInt(value, 10)),
  created_at: new Date().toISOString(),
};
if (claim.dependencies.some((value) => !Number.isInteger(value) || value < 1)) {
  throw new Error('--depends-on values must be positive GitHub issue numbers.');
}

const issueUrl = gh([
  'issue',
  'create',
  '--title',
  `[claim] ${taskId}: ${taskSlug}`,
  '--label',
  policy.claim_label,
  '--body',
  formatClaim(claim),
]);
const issueNumber = Number.parseInt(issueUrl.match(/\/(\d+)\/?$/)?.[1] ?? '', 10);
if (!Number.isInteger(issueNumber)) throw new Error(`Could not parse issue number from ${issueUrl}`);

const open = ghJson([
  'issue',
  'list',
  '--state',
  'open',
  '--label',
  policy.claim_label,
  '--limit',
  '500',
  '--json',
  'number,body,url',
]);
const conflicts = [];
for (const issue of open) {
  if (issue.number >= issueNumber) continue;
  let other;
  try {
    other = parseClaim(issue.body);
  } catch (error) {
    throw new Error(`Open claim #${issue.number} is malformed; fail closed: ${error.message}`);
  }
  if (anyScopeOverlap(claim.write_scope, other.write_scope)) {
    conflicts.push({ number: issue.number, branch: other.branch, scope: other.write_scope });
  }
}

writeJsonAtomic(claimMetadataPath(root), { issue_number: issueNumber, issue_url: issueUrl, claim });
if (conflicts.length) {
  const owners = conflicts.map((item) => `#${item.number} (${item.branch})`).join(', ');
  gh(['issue', 'comment', String(issueNumber), '--body', `Blocked before editing: lower-numbered overlapping claim(s) ${owners} own the path. This branch must isolate a disjoint scope or stop.`]);
  process.stderr.write(`${JSON.stringify({ status: 'blocked', issue_number: issueNumber, conflicts }, null, 2)}\n`);
  process.exitCode = 2;
} else {
  process.stdout.write(`${JSON.stringify({ status: 'claimed', issue_number: issueNumber, issue_url: issueUrl, branch, base_sha: baseSha }, null, 2)}\n`);
}
