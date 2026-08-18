import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { git, loadPolicy, repositoryRoot } from './lib.mjs';

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function lockPath() {
  const override = option('--git-common-dir');
  if (override) return path.join(path.resolve(override), 'hearth-parallel-integrator.lock');
  const root = repositoryRoot();
  const policy = loadPolicy(root);
  const common = git(['rev-parse', '--git-common-dir'], { cwd: root });
  return path.join(path.isAbsolute(common) ? common : path.resolve(root, common), policy.lock_file);
}

function leaseMinutes() {
  const override = option('--lease-minutes');
  return override ? Number(override) : loadPolicy().lock_lease_minutes;
}

export function acquire(target, minutes) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const token = crypto.randomUUID();
  const now = new Date();
  const record = {
    token,
    pid: process.pid,
    acquired_at: now.toISOString(),
    expires_at: new Date(now.getTime() + minutes * 60_000).toISOString(),
  };
  try {
    fs.writeFileSync(target, `${JSON.stringify(record, null, 2)}\n`, { flag: 'wx' });
    return { acquired: true, ...record };
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  let current;
  try {
    current = JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch {
    return { acquired: false, reason: 'existing lock is unreadable; manual inspection required' };
  }
  if (Date.parse(current.expires_at) > Date.now()) {
    return { acquired: false, reason: 'busy', holder: current };
  }
  const expired = `${target}.expired.${crypto.randomUUID()}`;
  try {
    fs.renameSync(target, expired);
  } catch (error) {
    if (['ENOENT', 'EACCES', 'EPERM'].includes(error.code)) return { acquired: false, reason: 'lock changed concurrently' };
    throw error;
  }
  fs.unlinkSync(expired);
  return acquire(target, minutes);
}

export function release(target, token) {
  if (!fs.existsSync(target)) return { released: false, reason: 'lock does not exist' };
  const current = JSON.parse(fs.readFileSync(target, 'utf8'));
  if (!token || current.token !== token) return { released: false, reason: 'token mismatch' };
  fs.unlinkSync(target);
  return { released: true };
}

export function renew(target, token, minutes) {
  if (!fs.existsSync(target)) return { renewed: false, reason: 'lock does not exist' };
  const current = JSON.parse(fs.readFileSync(target, 'utf8'));
  if (!token || current.token !== token) return { renewed: false, reason: 'token mismatch' };
  current.expires_at = new Date(Date.now() + minutes * 60_000).toISOString();
  const temporary = `${target}.${token}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(current, null, 2)}\n`, { flag: 'wx' });
  fs.renameSync(temporary, target);
  return { renewed: true, ...current };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const command = process.argv[2];
  const target = lockPath();
  const token = option('--token');
  let result;
  if (command === 'acquire') result = acquire(target, leaseMinutes());
  else if (command === 'release') result = release(target, token);
  else if (command === 'renew') result = renew(target, token, leaseMinutes());
  else throw new Error('Use acquire, renew --token <token>, or release --token <token>.');
  process.stdout.write(`${JSON.stringify({ ...result, lock_path: target })}\n`);
  if ((command === 'acquire' && !result.acquired) || (command !== 'acquire' && !result[`${command}ed`])) {
    process.exitCode = command === 'acquire' && result.reason === 'busy' ? 0 : 2;
  }
}
