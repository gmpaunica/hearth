import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { git, loadPolicy, repositoryRoot, writeJsonAtomic } from './lib.mjs';

function option(name, required = false) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : null;
  if (required && !value) throw new Error(`${name} is required.`);
  return value;
}

function statePath() {
  const override = option('--git-common-dir');
  const policy = loadPolicy();
  if (override) return path.join(path.resolve(override), policy.state_file);
  const root = repositoryRoot();
  const common = git(['rev-parse', '--git-common-dir'], { cwd: root });
  return path.join(path.isAbsolute(common) ? common : path.resolve(root, common), policy.state_file);
}

export function readState(target) {
  return fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8')) : null;
}

export function beginState(target, value) {
  if (fs.existsSync(target)) throw new Error(`Integration state already exists at ${target}.`);
  const state = { version: 1, phase: 'awaiting_merge', ...value, created_at: new Date().toISOString() };
  writeJsonAtomic(target, state);
  return state;
}

export function markMerged(target, sha) {
  const state = readState(target);
  if (!state) throw new Error('No pending integration state exists.');
  if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error('Merged SHA must be a full Git SHA.');
  state.phase = 'pending_preview';
  state.merge_sha = sha;
  state.merged_at = new Date().toISOString();
  writeJsonAtomic(target, state);
  return state;
}

export function clearState(target, sha) {
  const state = readState(target);
  if (!state) return { cleared: false, reason: 'no state' };
  if (!sha || state.merge_sha !== sha) return { cleared: false, reason: 'SHA mismatch' };
  fs.unlinkSync(target);
  return { cleared: true };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const command = process.argv[2];
  const target = statePath();
  let result;
  if (command === 'show') result = readState(target);
  else if (command === 'begin') {
    result = beginState(target, {
      pr: Number(option('--pr', true)),
      head: option('--head', true),
      tested_tree: option('--tested-tree', true),
      message: option('--message', true),
    });
  } else if (command === 'merged') result = markMerged(target, option('--sha', true));
  else if (command === 'clear') result = clearState(target, option('--sha', true));
  else throw new Error('Use show, begin, merged, or clear.');
  process.stdout.write(`${JSON.stringify({ state_path: target, state: result }, null, 2)}\n`);
  if (command === 'clear' && !result.cleared) process.exitCode = 2;
}
