export interface SignOutFlowDependencies {
  prepareServerSignOut: () => Promise<void>;
  onServerPrepared: () => Promise<void> | void;
  clearLocalNotifications: () => Promise<void>;
  signOutSession: () => Promise<void>;
}

/**
 * Tear down the server-side identity links before ending the local session.
 *
 * Server cleanup is one database transaction: token invalidation and every home
 * departure either both commit or both roll back. Native notification cleanup
 * is best-effort after that transaction; a platform failure must not strand an
 * already-cleaned identity in the old session.
 */
export async function runSignOutFlow({
  prepareServerSignOut,
  onServerPrepared,
  clearLocalNotifications,
  signOutSession,
}: SignOutFlowDependencies): Promise<void> {
  await prepareServerSignOut();
  await onServerPrepared();
  try {
    await clearLocalNotifications();
  } catch {
    // Server routing is already disabled. Continue removing the local session.
  }
  await signOutSession();
}
