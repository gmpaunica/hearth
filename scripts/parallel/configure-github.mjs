import { loadPolicy, repoFromRemote } from './lib.mjs';
import { assertGhAuth, gh, ghJson } from './github.mjs';

const policy = loadPolicy();
assertGhAuth();
const repository = repoFromRemote();
if (repository.toLowerCase() !== policy.repository.toLowerCase()) {
  throw new Error(`Policy repository ${policy.repository} does not match origin ${repository}.`);
}
const info = ghJson(['api', `repos/${repository}`]);
if (!info.permissions?.admin) throw new Error('GitHub admin permission is required for branch protection.');

const labels = [
  [policy.claim_label, '1D76DB', 'Automated Hearth parallel write reservation'],
  [policy.blocked_label, 'D73A4A', 'Requires an unambiguous integration decision'],
  [policy.impact_labels.native, 'B60205', 'Requires an explicitly authorized native build'],
  [policy.impact_labels.database, 'FBCA04', 'Requires an explicitly authorized database deployment'],
  [policy.integration_request_label, '0E8A16', 'Integrator may fulfill declared shared-file requests'],
  [policy.preview_pending_label, '5319E7', 'Merged SHA is waiting for verified EAS preview publication'],
];
for (const [name, color, description] of labels) {
  gh(['label', 'create', name, '--color', color, '--description', description, '--force']);
}

const protection = {
  required_status_checks: { strict: true, contexts: [policy.required_check] },
  enforce_admins: true,
  required_pull_request_reviews: {
    dismiss_stale_reviews: false,
    require_code_owner_reviews: false,
    required_approving_review_count: 0,
    require_last_push_approval: false,
  },
  restrictions: null,
  required_linear_history: false,
  allow_force_pushes: false,
  allow_deletions: false,
  block_creations: false,
  required_conversation_resolution: true,
  lock_branch: false,
  allow_fork_syncing: true,
};
gh([
  'api', '--method', 'PUT',
  `repos/${repository}/branches/${encodeURIComponent(policy.integration_branch)}/protection`,
  '--input', '-',
], { input: JSON.stringify(protection) });
gh([
  'api', '--method', 'PATCH', `repos/${repository}`, '--input', '-',
], {
  input: JSON.stringify({
    allow_merge_commit: true,
    allow_squash_merge: false,
    allow_rebase_merge: false,
    delete_branch_on_merge: false,
  }),
});
process.stdout.write(`Configured labels, merge commits, and protection for ${repository}:${policy.integration_branch}.\n`);
