import { loadPolicy, parseClaim } from './lib.mjs';
import { assertGhAuth, ghJson } from './github.mjs';

const policy = loadPolicy();
assertGhAuth();
const blockedLabels = new Set([
  policy.blocked_label,
  policy.impact_labels.native,
  policy.impact_labels.database,
  policy.preview_pending_label,
]);
const pulls = ghJson([
  'pr', 'list', '--base', policy.integration_branch, '--state', 'open', '--limit', '200',
  '--json', 'number,title,url,isDraft,body,createdAt,headRefName,labels,reviewDecision',
]);
const eligible = [];

for (const pull of pulls) {
  const labels = pull.labels.map((label) => label.name);
  if (pull.isDraft || labels.some((label) => blockedLabels.has(label)) || pull.reviewDecision === 'CHANGES_REQUESTED') continue;
  const close = String(pull.body ?? '').match(/(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/i);
  if (!close) continue;
  const claimNumber = Number(close[1]);
  const issue = ghJson(['issue', 'view', String(claimNumber), '--json', 'body,state']);
  let claim;
  try {
    claim = parseClaim(issue.body);
  } catch {
    continue;
  }
  let dependenciesReady = true;
  for (const dependency of claim.dependencies) {
    const dependencyIssue = ghJson(['issue', 'view', String(dependency), '--json', 'state']);
    if (dependencyIssue.state !== 'CLOSED') dependenciesReady = false;
  }
  if (!dependenciesReady) continue;
  const timeline = ghJson([
    'api', '--method', 'GET', `repos/${policy.repository}/issues/${pull.number}/timeline`,
    '-f', 'per_page=100',
  ]);
  const readyEvent = timeline.find((event) => event.event === 'ready_for_review');
  eligible.push({
    number: pull.number,
    title: pull.title,
    url: pull.url,
    branch: pull.headRefName,
    claim: claimNumber,
    ready_at: readyEvent?.created_at ?? pull.createdAt,
    integration_requests: claim.integration_requests,
  });
}

eligible.sort((left, right) => Date.parse(left.ready_at) - Date.parse(right.ready_at) || left.number - right.number);
process.stdout.write(`${JSON.stringify({ selected: eligible[0] ?? null, eligible_count: eligible.length }, null, 2)}\n`);
