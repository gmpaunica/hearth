import { parseClaim, loadPolicy } from './lib.mjs';
import { assertGhAuth, gh, ghJson } from './github.mjs';

const WARNING_MARKER = '<!-- hearth-claim-expiry-warning -->';
const RELEASE_MARKER = '<!-- hearth-claim-expired -->';
const policy = loadPolicy();
assertGhAuth();

const issues = ghJson([
  'issue', 'list', '--state', 'open', '--label', policy.claim_label,
  '--limit', '500', '--json', 'number,body,createdAt,url',
]);
const now = Date.now();
const summary = { active: 0, attached: 0, warned: [], released: [], malformed: [] };

for (const issue of issues) {
  let claim;
  try {
    claim = parseClaim(issue.body);
  } catch (error) {
    summary.malformed.push({ number: issue.number, error: error.message });
    continue;
  }
  const ageHours = (now - Date.parse(issue.createdAt)) / 3_600_000;
  if (ageHours < policy.claim_warning_hours) {
    summary.active += 1;
    continue;
  }
  const remoteBranch = gh(['api', `repos/${policy.repository}/git/ref/heads/${encodeURIComponent(claim.branch)}`], {
    allowFailure: true,
  });
  const pullRequests = ghJson([
    'pr', 'list', '--state', 'all', '--head', claim.branch, '--limit', '1', '--json', 'number,url,state',
  ]);
  if (remoteBranch || pullRequests.length) {
    summary.attached += 1;
    continue;
  }

  const details = ghJson(['issue', 'view', String(issue.number), '--json', 'comments']);
  const comments = details.comments.map((comment) => comment.body).join('\n');
  if (ageHours >= policy.claim_release_hours) {
    if (!comments.includes(RELEASE_MARKER)) {
      gh(['issue', 'comment', String(issue.number), '--body', `${RELEASE_MARKER}\nReleased automatically after ${policy.claim_release_hours} hours because no remote branch or PR exists. A new worker must create a new claim.`]);
    }
    gh(['issue', 'close', String(issue.number), '--reason', 'not planned']);
    summary.released.push(issue.number);
  } else if (!comments.includes(WARNING_MARKER)) {
    gh(['issue', 'comment', String(issue.number), '--body', `${WARNING_MARKER}\nThis reservation has no remote branch or PR after ${policy.claim_warning_hours} hours. It will be released at ${policy.claim_release_hours} hours unless a branch or PR appears.`]);
    summary.warned.push(issue.number);
  }
}

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (summary.malformed.length) process.exitCode = 1;
