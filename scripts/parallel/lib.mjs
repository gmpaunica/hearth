import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CLAIM_MARKER = 'hearth-parallel-claim:v1';

export function executable(name) {
  if (name === 'gh' && process.platform === 'win32') {
    const installed = path.join(
      process.env.LOCALAPPDATA ?? '',
      'Programs',
      'GitHub CLI',
      'gh.exe',
    );
    if (fs.existsSync(installed)) return installed;
  }
  return name;
}

function invocation(command, args) {
  if (process.platform === 'win32' && ['npm', 'npx'].includes(command)) {
    const cli = path.join(
      path.dirname(process.execPath),
      'node_modules',
      'npm',
      'bin',
      command === 'npm' ? 'npm-cli.js' : 'npx-cli.js',
    );
    if (fs.existsSync(cli)) return { command: process.execPath, args: [cli, ...args] };
  }
  return { command: executable(command), args };
}

export function run(command, args, options = {}) {
  const resolved = invocation(command, args);
  const result = spawnSync(resolved.command, resolved.args, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: options.env ?? process.env,
    input: options.input,
    stdio: options.stdio ?? 'pipe',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`${command} ${args.join(' ')} failed (${result.status})${detail ? `\n${detail}` : ''}`);
  }
  if (options.stdio === 'inherit') return '';
  return (result.stdout ?? '').trim();
}

export function git(args, options = {}) {
  return run('git', args, options);
}

export function repositoryRoot(cwd = process.cwd()) {
  return git(['rev-parse', '--show-toplevel'], { cwd });
}

export function loadPolicy(cwd = process.cwd()) {
  const root = repositoryRoot(cwd);
  return JSON.parse(fs.readFileSync(path.join(root, '.codex', 'parallel-policy.json'), 'utf8'));
}

export function normalizeRepoPath(value, kind = 'exact') {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Scope paths must be non-empty strings.');
  }
  let normalized = value.trim().replaceAll('\\', '/').replace(/^\.\//, '');
  normalized = path.posix.normalize(normalized);
  if (
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    normalized.startsWith('/') ||
    /^[a-zA-Z]:/.test(normalized)
  ) {
    throw new Error(`Scope path must be repo-relative: ${value}`);
  }
  if (kind === 'prefix') normalized = `${normalized.replace(/\/+$/, '')}/`;
  else normalized = normalized.replace(/\/+$/, '');
  return normalized;
}

export function normalizeScope(scope) {
  if (!scope || !['exact', 'prefix'].includes(scope.kind)) {
    throw new Error(`Invalid scope rule: ${JSON.stringify(scope)}`);
  }
  return { kind: scope.kind, path: normalizeRepoPath(scope.path, scope.kind) };
}

export function ruleMatches(ruleInput, fileInput) {
  const rule = normalizeScope(ruleInput);
  const file = normalizeRepoPath(fileInput);
  return rule.kind === 'exact' ? file === rule.path : file.startsWith(rule.path);
}

export function scopesOverlap(leftInput, rightInput) {
  const left = normalizeScope(leftInput);
  const right = normalizeScope(rightInput);
  if (left.kind === 'exact' && right.kind === 'exact') return left.path === right.path;
  if (left.kind === 'prefix' && right.kind === 'prefix') {
    return left.path.startsWith(right.path) || right.path.startsWith(left.path);
  }
  const prefix = left.kind === 'prefix' ? left : right;
  const exact = left.kind === 'exact' ? left : right;
  return exact.path.startsWith(prefix.path);
}

export function anyScopeOverlap(left, right) {
  return left.some((a) => right.some((b) => scopesOverlap(a, b)));
}

export function formatClaim(claim) {
  return [
    'This issue is coordination state created by the Hearth worker workflow.',
    '',
    `<!-- ${CLAIM_MARKER}`,
    JSON.stringify(claim, null, 2),
    '-->',
  ].join('\n');
}

export function parseClaim(body) {
  const escaped = CLAIM_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(body ?? '').match(new RegExp(`<!--\\s*${escaped}\\s*([\\s\\S]*?)-->`));
  if (!match) throw new Error(`Missing ${CLAIM_MARKER} machine-readable block.`);
  const claim = JSON.parse(match[1].trim());
  validateClaimShape(claim);
  return claim;
}

export function validateClaimShape(claim) {
  if (claim.version !== 1) throw new Error('Claim version must be 1.');
  if (!/^codex\/[a-z0-9][a-z0-9-]*$/.test(claim.branch ?? '')) {
    throw new Error(`Invalid worker branch: ${claim.branch}`);
  }
  if (!/^[0-9a-f]{40}$/i.test(claim.base_sha ?? '')) {
    throw new Error('Claim base_sha must be a full Git SHA.');
  }
  if (!Array.isArray(claim.write_scope) || claim.write_scope.length === 0) {
    throw new Error('Claim write_scope must contain at least one rule.');
  }
  claim.write_scope = claim.write_scope.map(normalizeScope);
  claim.integration_requests ??= [];
  claim.dependencies ??= [];
  if (!Array.isArray(claim.integration_requests) || !Array.isArray(claim.dependencies)) {
    throw new Error('Claim requests and dependencies must be arrays.');
  }
  for (const request of claim.integration_requests) {
    request.path = normalizeRepoPath(request.path);
    if (!request.reason?.trim()) throw new Error(`Integration request ${request.path} needs a reason.`);
  }
  claim.native_impact = Boolean(claim.native_impact);
  claim.database_impact = Boolean(claim.database_impact);
  return claim;
}

export function isIntegratorOwned(policy, file) {
  return policy.integrator_owned.some((rule) => ruleMatches(rule, file));
}

export function isIntegrationRequestOnly(policy, file) {
  const normalized = normalizeRepoPath(file);
  return policy.integration_request_only.includes(normalized);
}

export function hasImpact(policy, kind, files) {
  return files.some((file) => policy[`${kind}_impact`].some((rule) => ruleMatches(rule, file)));
}

export function previewPublicationDecision(updates, sha) {
  const marker = `[sha:${sha}]`;
  const index = updates.findIndex((update) => update.message?.includes(marker));
  if (index === 0) return { action: 'already-published', update: updates[0] };
  if (index > 0) return { action: 'blocked-not-newest', update: updates[index] };
  return { action: 'publish' };
}

export function validateChangeSet({
  policy,
  claim,
  files,
  labels = [],
  allowApprovedIntegrationRequests = false,
}) {
  validateClaimShape(claim);
  const errors = [];
  const normalizedFiles = [...new Set(files.map((file) => normalizeRepoPath(file)))];
  const approved = allowApprovedIntegrationRequests && labels.includes(policy.integration_request_label);
  const requested = new Set(claim.integration_requests.map((request) => request.path));

  for (const file of normalizedFiles) {
    const requestOnly = isIntegrationRequestOnly(policy, file);
    const owned = isIntegratorOwned(policy, file);
    const requestAllowed = approved && requested.has(file) && (requestOnly || owned);
    if (owned && !requestAllowed) {
      errors.push(`${file}: integrator-owned path`);
      continue;
    }
    if (requestOnly && !requestAllowed) {
      errors.push(`${file}: must be fulfilled through an approved integration_request`);
      continue;
    }
    if (!requestAllowed && !claim.write_scope.some((scope) => ruleMatches(scope, file))) {
      errors.push(`${file}: outside claimed write_scope`);
    }
  }

  const native = hasImpact(policy, 'native', normalizedFiles);
  const database = hasImpact(policy, 'database', normalizedFiles);
  if (native && !claim.native_impact) errors.push('native-impacting changes were not declared');
  if (database && !claim.database_impact) errors.push('database-impacting changes were not declared');
  if (native && !labels.includes(policy.impact_labels.native)) {
    errors.push(`native-impacting PR is missing label ${policy.impact_labels.native}`);
  }
  if (database && !labels.includes(policy.impact_labels.database)) {
    errors.push(`database-impacting PR is missing label ${policy.impact_labels.database}`);
  }

  return { errors, files: normalizedFiles, native, database };
}

export function claimMetadataPath(cwd = process.cwd()) {
  const gitDir = git(['rev-parse', '--git-dir'], { cwd });
  const absolute = path.isAbsolute(gitDir) ? gitDir : path.resolve(cwd, gitDir);
  return path.join(absolute, 'hearth-claim.json');
}

export function writeJsonAtomic(target, value) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
  fs.renameSync(temporary, target);
}

export function repoFromRemote(cwd = process.cwd()) {
  const remote = git(['remote', 'get-url', 'origin'], { cwd });
  const match = remote.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?$/i);
  if (!match) throw new Error(`Cannot derive GitHub repository from ${remote}`);
  return `${match[1]}/${match[2]}`;
}

export function currentScriptDirectory() {
  return path.dirname(fileURLToPath(import.meta.url));
}
