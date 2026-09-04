import assert from 'node:assert/strict';
import test from 'node:test';

import { runSignOutFlow } from '../src/state/signOutFlow.ts';

function step(calls, name, error = null) {
  return async () => {
    calls.push(name);
    if (error) throw error;
  };
}

test('sign-out atomically prepares the server, reconciles the client, clears notifications, then ends the session', async () => {
  const calls = [];

  await runSignOutFlow({
    prepareServerSignOut: step(calls, 'prepare-server'),
    onServerPrepared: step(calls, 'reconcile-client'),
    clearLocalNotifications: step(calls, 'clear-local-notifications'),
    signOutSession: step(calls, 'sign-out-session'),
  });

  assert.deepEqual(calls, [
    'prepare-server',
    'reconcile-client',
    'clear-local-notifications',
    'sign-out-session',
  ]);
});

test('sign-out stops before reconciliation, local cleanup, or session termination when the server transaction fails', async () => {
  const calls = [];
  const failure = new Error('server cleanup failed');

  await assert.rejects(
    runSignOutFlow({
      prepareServerSignOut: step(calls, 'prepare-server', failure),
      onServerPrepared: step(calls, 'reconcile-client'),
      clearLocalNotifications: step(calls, 'clear-local-notifications'),
      signOutSession: step(calls, 'sign-out-session'),
    }),
    failure,
  );

  assert.deepEqual(calls, ['prepare-server']);
});

test('local notification cleanup failure does not strand an already-cleaned server identity', async () => {
  const calls = [];

  await runSignOutFlow({
    prepareServerSignOut: step(calls, 'prepare-server'),
    onServerPrepared: step(calls, 'reconcile-client'),
    clearLocalNotifications: step(
      calls,
      'clear-local-notifications',
      new Error('native notification cleanup failed'),
    ),
    signOutSession: step(calls, 'sign-out-session'),
  });

  assert.deepEqual(calls, [
    'prepare-server',
    'reconcile-client',
    'clear-local-notifications',
    'sign-out-session',
  ]);
});

test('session termination failure is reported only after server cleanup and client reconciliation', async () => {
  const calls = [];
  const failure = new Error('session sign-out failed');

  await assert.rejects(
    runSignOutFlow({
      prepareServerSignOut: step(calls, 'prepare-server'),
      onServerPrepared: step(calls, 'reconcile-client'),
      clearLocalNotifications: step(calls, 'clear-local-notifications'),
      signOutSession: step(calls, 'sign-out-session', failure),
    }),
    failure,
  );

  assert.deepEqual(calls, [
    'prepare-server',
    'reconcile-client',
    'clear-local-notifications',
    'sign-out-session',
  ]);
});
