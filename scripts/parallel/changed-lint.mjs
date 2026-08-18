import fs from 'node:fs';
import { claimMetadataPath, git, repositoryRoot, run } from './lib.mjs';

const root = repositoryRoot();
const baseIndex = process.argv.indexOf('--base');
let base = baseIndex >= 0 ? process.argv[baseIndex + 1] : null;
if (!base && process.env.GITHUB_BASE_REF) base = `origin/${process.env.GITHUB_BASE_REF}`;
if (!base) {
  const metadata = claimMetadataPath(root);
  if (fs.existsSync(metadata)) base = JSON.parse(fs.readFileSync(metadata, 'utf8')).claim.base_sha;
}
if (!base) base = 'HEAD^';

git(['rev-parse', '--verify', `${base}^{commit}`], { cwd: root });
const files = git(['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`], { cwd: root })
  .split(/\r?\n/)
  .filter((file) => /\.(?:ts|tsx)$/.test(file));

if (files.length === 0) {
  process.stdout.write(`No changed TypeScript files relative to ${base}.\n`);
} else {
  process.stdout.write(`Linting ${files.length} changed TypeScript files relative to ${base}.\n`);
  run('npx', ['eslint', ...files], { cwd: root, stdio: 'inherit' });
}
