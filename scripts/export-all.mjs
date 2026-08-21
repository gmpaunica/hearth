import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporaryRoot = path.resolve(root, 'tmp');
const outputRoot = path.join(temporaryRoot, 'exports');
const expectedPrefix = `${temporaryRoot}${path.sep}`.toLowerCase();

if (!`${outputRoot}${path.sep}`.toLowerCase().startsWith(expectedPrefix)) {
  throw new Error(`Refusing to clear unexpected export path: ${outputRoot}`);
}

fs.rmSync(outputRoot, { recursive: true, force: true });

const npxCli = path.join(
  path.dirname(process.execPath),
  'node_modules',
  'npm',
  'bin',
  'npx-cli.js',
);
const npxCommand = process.platform === 'win32' && fs.existsSync(npxCli)
  ? process.execPath
  : 'npx';
const npxPrefix = npxCommand === process.execPath ? [npxCli] : [];

for (const platform of ['android', 'ios', 'web']) {
  const output = path.join(outputRoot, platform);
  process.stdout.write(`Exporting ${platform} to ${output}\n`);
  const result = spawnSync(
    npxCommand,
    [...npxPrefix, 'expo', 'export', '--platform', platform, '--output-dir', output, '--clear'],
    { cwd: root, env: process.env, stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
