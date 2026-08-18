import fs from 'node:fs';
import { claimMetadataPath, git, loadPolicy, repositoryRoot, validateChangeSet } from './lib.mjs';

const root = repositoryRoot();
const policy = loadPolicy(root);
const metadataPath = claimMetadataPath(root);
if (!fs.existsSync(metadataPath)) throw new Error('No worktree claim metadata exists. Run claim.mjs before editing.');
const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
const branch = git(['branch', '--show-current'], { cwd: root });
if (branch !== metadata.claim.branch) throw new Error(`Claim belongs to ${metadata.claim.branch}, not ${branch}.`);

const files = git(
  ['diff', '--name-only', '--diff-filter=ACMR', `${metadata.claim.base_sha}...HEAD`],
  { cwd: root },
)
  .split(/\r?\n/)
  .filter(Boolean);
const uncommitted = [
  git(['diff', '--name-only', '--diff-filter=ACMR'], { cwd: root }),
  git(['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { cwd: root }),
  git(['ls-files', '--others', '--exclude-standard'], { cwd: root }),
]
  .flatMap((output) => output.split(/\r?\n/))
  .filter(Boolean);
const result = validateChangeSet({ policy, claim: metadata.claim, files: [...files, ...uncommitted] });
if (result.errors.length) {
  for (const error of result.errors) process.stderr.write(`${error}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Local scope is valid for claim #${metadata.issue_number} (${result.files.length} changed paths).\n`);
}
