import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  anyScopeOverlap,
  git,
  loadPolicy,
  parseClaim,
  validateChangeSet,
} from './lib.mjs';
import { githubPages, githubRequest } from './github.mjs';

export async function validatePullRequest({ policy, pullRequest, claimIssue, openClaims, files }) {
  const errors = [];
  let claim;
  try {
    claim = parseClaim(claimIssue.body);
  } catch (error) {
    return { errors: [error.message] };
  }
  const issueLabels = (claimIssue.labels ?? []).map((label) => (typeof label === 'string' ? label : label.name));
  const prLabels = (pullRequest.labels ?? []).map((label) => (typeof label === 'string' ? label : label.name));
  if (!issueLabels.includes(policy.claim_label)) errors.push(`Claim issue lacks ${policy.claim_label}.`);
  if (claimIssue.state !== 'open') errors.push(`Claim issue #${claimIssue.number} is not open.`);
  if (pullRequest.base.ref !== policy.integration_branch) errors.push(`PR base must be ${policy.integration_branch}.`);
  if (pullRequest.head.ref !== claim.branch) errors.push(`PR head ${pullRequest.head.ref} does not match claim branch ${claim.branch}.`);

  for (const otherIssue of openClaims) {
    if (otherIssue.number >= claimIssue.number || otherIssue.number === claimIssue.number) continue;
    let other;
    try {
      other = parseClaim(otherIssue.body);
    } catch (error) {
      errors.push(`Lower open claim #${otherIssue.number} is malformed: ${error.message}`);
      continue;
    }
    if (anyScopeOverlap(claim.write_scope, other.write_scope)) {
      errors.push(`Lower open claim #${otherIssue.number} owns an overlapping path.`);
    }
  }

  const changes = validateChangeSet({
    policy,
    claim,
    files,
    labels: prLabels,
    allowApprovedIntegrationRequests: true,
  });
  errors.push(...changes.errors);
  return { errors, claim, changes };
}

async function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!eventPath || !token || !repository) {
    throw new Error('GITHUB_EVENT_PATH, GITHUB_TOKEN, and GITHUB_REPOSITORY are required.');
  }
  const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  const pullRequest = event.pull_request;
  if (!pullRequest) throw new Error('This validator requires a pull_request event.');
  const close = String(pullRequest.body ?? '').match(/(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/i);
  if (!close) throw new Error('PR body must link its reservation with Closes #<claim>.');
  const claimNumber = Number.parseInt(close[1], 10);
  const policy = loadPolicy();
  const encodedLabel = encodeURIComponent(policy.claim_label);

  const [claimIssue, issues, changed] = await Promise.all([
    githubRequest(`/repos/${repository}/issues/${claimNumber}`, { token }),
    githubPages(`/repos/${repository}/issues?state=open&labels=${encodedLabel}`, { token }),
    githubPages(`/repos/${repository}/pulls/${pullRequest.number}/files`, { token }),
  ]);
  const openClaims = issues.filter((issue) => !issue.pull_request);
  const result = await validatePullRequest({
    policy,
    pullRequest,
    claimIssue,
    openClaims,
    files: changed.map((file) => file.filename),
  });
  if (result.claim) {
    try {
      git(['merge-base', '--is-ancestor', result.claim.base_sha, 'HEAD']);
    } catch {
      result.errors.push(`Claim base ${result.claim.base_sha} is not an ancestor of the PR head.`);
    }
    try {
      git(['merge-base', '--is-ancestor', result.claim.base_sha, `origin/${policy.integration_branch}`]);
    } catch {
      result.errors.push(`Claim base ${result.claim.base_sha} is not from ${policy.integration_branch}.`);
    }
  }
  if (result.errors.length) {
    for (const error of result.errors) process.stderr.write(`${error}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`Claim #${claimNumber} owns all ${result.changes.files.length} changed paths.\n`);
  }
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
