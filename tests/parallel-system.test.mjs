import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  anyScopeOverlap,
  formatClaim,
  loadPolicy,
  parseClaim,
  previewPublicationDecision,
  scopesOverlap,
  validateChangeSet,
} from '../scripts/parallel/lib.mjs';
import { acquire, release } from '../scripts/parallel/integrator-lock.mjs';
import {
  beginState,
  clearState,
  markMerged,
  readState,
} from '../scripts/parallel/integrator-state.mjs';
import { validatePullRequest } from '../scripts/parallel/validate-pr.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = loadPolicy(root);
const sha = 'a'.repeat(40);

function claim(overrides = {}) {
  return {
    version: 1,
    task_id: '42',
    slug: 'garden-polish',
    branch: 'codex/42-garden-polish',
    base_sha: sha,
    write_scope: [{ kind: 'exact', path: 'src/scene/rooms/Garden.tsx' }],
    integration_requests: [],
    native_impact: false,
    database_impact: false,
    dependencies: [],
    created_at: '2026-08-18T00:00:00.000Z',
    ...overrides,
  };
}

function issue(number, value = claim()) {
  return {
    number,
    state: 'open',
    labels: [{ name: policy.claim_label }],
    body: formatClaim(value),
  };
}

function pull(value = claim(), labels = []) {
  return {
    number: 100,
    base: { ref: policy.integration_branch },
    head: { ref: value.branch },
    labels: labels.map((name) => ({ name })),
  };
}

test('exact and prefix scope overlap is deterministic', () => {
  assert.equal(scopesOverlap(
    { kind: 'prefix', path: 'src/scene/rooms/' },
    { kind: 'exact', path: 'src/scene/rooms/Garden.tsx' },
  ), true);
  assert.equal(anyScopeOverlap(
    [{ kind: 'prefix', path: 'assets/garden/' }],
    [{ kind: 'prefix', path: 'assets/bedroom/' }],
  ), false);
});

test('two disjoint claims validate independently', async () => {
  const first = claim();
  const second = claim({
    branch: 'codex/43-bedroom-polish',
    write_scope: [{ kind: 'exact', path: 'src/scene/rooms/Bedroom.tsx' }],
  });
  const result = await validatePullRequest({
    policy,
    pullRequest: pull(second),
    claimIssue: issue(43, second),
    openClaims: [issue(42, first), issue(43, second)],
    files: ['src/scene/rooms/Bedroom.tsx'],
  });
  assert.deepEqual(result.errors, []);
});

test('lower issue number wins an overlapping claim', async () => {
  const later = claim({ branch: 'codex/43-garden-koi' });
  const result = await validatePullRequest({
    policy,
    pullRequest: pull(later),
    claimIssue: issue(43, later),
    openClaims: [issue(42), issue(43, later)],
    files: ['src/scene/rooms/Garden.tsx'],
  });
  assert.match(result.errors.join('\n'), /Lower open claim #42 owns an overlapping path/);
});

test('worker scope and integrator ownership are enforced', () => {
  assert.deepEqual(validateChangeSet({
    policy,
    claim: claim(),
    files: ['src/scene/rooms/Garden.tsx'],
  }).errors, []);
  const forbidden = validateChangeSet({
    policy,
    claim: claim({ write_scope: [{ kind: 'exact', path: 'src/scene/rooms/RoomComposition.tsx' }] }),
    files: ['src/scene/rooms/RoomComposition.tsx'],
  });
  assert.match(forbidden.errors.join('\n'), /integrator-owned path/);
});

test('shared config changes require a declared and approved integration request', () => {
  const requested = claim({
    integration_requests: [{ path: 'tsconfig.json', reason: 'Add a focused alias.' }],
  });
  assert.match(validateChangeSet({ policy, claim: requested, files: ['tsconfig.json'] }).errors.join('\n'), /approved integration_request/);
  assert.deepEqual(validateChangeSet({
    policy,
    claim: requested,
    files: ['tsconfig.json'],
    labels: [policy.integration_request_label],
    allowApprovedIntegrationRequests: true,
  }).errors, []);
  const composition = claim({
    integration_requests: [{
      path: 'src/scene/rooms/RoomComposition.tsx',
      reason: 'Mount the separately claimed room after review.',
    }],
  });
  assert.deepEqual(validateChangeSet({
    policy,
    claim: composition,
    files: ['src/scene/rooms/RoomComposition.tsx'],
    labels: [policy.integration_request_label],
    allowApprovedIntegrationRequests: true,
  }).errors, []);
});

test('native and database impact must be declared and labeled', () => {
  const native = validateChangeSet({
    policy,
    claim: claim({
      write_scope: [{ kind: 'prefix', path: 'ios/' }],
    }),
    files: ['ios/Hearth/AppDelegate.swift'],
  });
  assert.match(native.errors.join('\n'), /not declared/);
  assert.match(native.errors.join('\n'), /native-build-required/);
  const database = validateChangeSet({
    policy,
    claim: claim({
      write_scope: [{ kind: 'prefix', path: 'supabase/migrations/' }],
      database_impact: true,
    }),
    files: ['supabase/migrations/20260818000000_example.sql'],
    labels: [policy.impact_labels.database],
  });
  assert.deepEqual(database.errors, []);
});

test('claim machine block round-trips exactly', () => {
  assert.deepEqual(parseClaim(formatClaim(claim())), claim());
});

test('pending preview state is idempotent and blocks a second merge', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hearth-state-'));
  const target = path.join(directory, 'state.json');
  try {
    beginState(target, { pr: 7, head: 'codex/7-test', tested_tree: 'b'.repeat(40), message: 'Test' });
    assert.throws(() => beginState(target, { pr: 8 }), /already exists/);
    markMerged(target, 'c'.repeat(40));
    assert.equal(readState(target).phase, 'pending_preview');
    assert.equal(clearState(target, 'd'.repeat(40)).cleared, false);
    assert.equal(readState(target).merge_sha, 'c'.repeat(40));
    assert.equal(clearState(target, 'c'.repeat(40)).cleared, true);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('preview retry never duplicates a matching SHA', () => {
  const matching = { message: `Feature [sha:${sha}]`, group: 'group-1' };
  assert.equal(previewPublicationDecision([], sha).action, 'publish');
  assert.equal(previewPublicationDecision([matching], sha).action, 'already-published');
  assert.equal(previewPublicationDecision([{ message: 'newer' }, matching], sha).action, 'blocked-not-newest');
});

test('atomic integrator lock admits only one holder', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hearth-lock-'));
  const target = path.join(directory, 'lock.json');
  try {
    const first = acquire(target, 5);
    const second = acquire(target, 5);
    assert.equal(first.acquired, true);
    assert.equal(second.acquired, false);
    assert.equal(release(target, 'wrong-token').released, false);
    assert.equal(release(target, first.token).released, true);
    assert.equal(acquire(target, 5).acquired, true);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('concurrent scheduler processes cannot both acquire the integration lease', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hearth-lock-process-'));
  const script = path.join(root, 'scripts', 'parallel', 'integrator-lock.mjs');
  const start = () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, 'acquire', '--git-common-dir', directory, '--lease-minutes', '5'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
  try {
    const runs = await Promise.all([start(), start()]);
    const records = runs.map((run) => JSON.parse(run.stdout));
    assert.equal(records.filter((record) => record.acquired).length, 1);
    assert.equal(records.filter((record) => !record.acquired).length, 1);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('synthetic merge gate fetches the newest base and runs every required check', () => {
  const source = fs.readFileSync(path.join(root, 'scripts', 'parallel', 'synthetic-merge.mjs'), 'utf8');
  for (const required of [
    "git(['fetch', 'origin', policy.integration_branch]",
    "run('npm', ['ci']",
    "run('npm', ['run', 'typecheck']",
    "run('npm', ['test']",
    "run('npm', ['run', 'lint:changed'",
    "run('npm', ['run', 'export:all']",
  ]) assert.ok(source.includes(required), `missing synthetic merge step: ${required}`);
  assert.ok(source.indexOf("run('npm', ['run', 'export:all']") < source.indexOf("git(['write-tree']"));
});
