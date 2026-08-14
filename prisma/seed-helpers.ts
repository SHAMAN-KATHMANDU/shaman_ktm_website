// Create-only seeding primitive. The seed bootstraps missing rows and NEVER
// touches existing ones: live content is owned by the admin UI / MCP, and the
// container entrypoint reruns the seed on every start while RUN_DB_SEED=1 —
// an update path here is a standing order to revert admin edits on every
// deploy (Aug 2026: product prices reset on each push until the update blocks
// were removed).

/**
 * Creates the row when `find` matches nothing; leaves an existing row fully
 * untouched (no update, no `updatedAt` bump, no child rebuild). `find` should
 * select a minimal column (e.g. `{ select: { id: true } }`). `onCreate` runs
 * only after a fresh create — put child-table inserts (images, variations,
 * bundle items…) there so they can never clobber a live parent's children.
 * Returns true when the row was created.
 */
export async function ensureRow(
  find: () => Promise<object | null>,
  create: () => Promise<unknown>,
  onCreate?: () => Promise<void>,
): Promise<boolean> {
  if (await find()) return false;
  await create();
  if (onCreate) await onCreate();
  return true;
}
