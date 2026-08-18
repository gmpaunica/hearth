import fs from 'node:fs';
import path from 'node:path';
import { repositoryRoot, run } from './lib.mjs';

const root = repositoryRoot();
const outputRoot = path.resolve(root, 'tmp', 'parallel-exports');
const allowedRoot = `${path.resolve(root, 'tmp')}${path.sep}`.toLowerCase();
if (!`${outputRoot}${path.sep}`.toLowerCase().startsWith(allowedRoot)) {
  throw new Error(`Refusing to clear unexpected export path: ${outputRoot}`);
}
fs.rmSync(outputRoot, { recursive: true, force: true });

for (const platform of ['android', 'ios', 'web']) {
  const output = path.join(outputRoot, platform);
  process.stdout.write(`Exporting ${platform} to ${output}\n`);
  run('npx', ['expo', 'export', '--platform', platform, '--output-dir', output, '--clear'], {
    cwd: root,
    stdio: 'inherit',
  });
}
