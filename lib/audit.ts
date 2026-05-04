// Append-only audit log for /sysuser mutations. The AdminLog table already
// exists (prisma/schema.prisma) and the activity page reads from it; this
// module is the missing write side.
//
// Calls are fire-and-forget — a logging failure never blocks the user-facing
// mutation, but the error is surfaced to the server console for ops to see.

import { prisma } from "@/lib/db";

export type AdminAction =
  | "create"
  | "update"
  | "delete"
  | "publish"
  | "unpublish"
  | "login"
  | "logout"
  | "login_failed"
  | "change_password"
  | "upload"
  | "bulk_update";

interface LogArgs {
  actor: string;
  action: AdminAction;
  entity: string;
  entityId?: string | null;
  summary?: string | null;
}

export function logAction(args: LogArgs): void {
  // Intentionally not awaited — keeps the request hot path fast and decouples
  // mutation success from log persistence.
  prisma.adminLog
    .create({
      data: {
        actor: args.actor,
        action: args.action,
        entity: args.entity,
        entityId: args.entityId ?? null,
        summary: args.summary ?? null,
      },
    })
    .catch((err) => {
      console.error("[audit] failed to write AdminLog entry", {
        actor: args.actor,
        action: args.action,
        entity: args.entity,
        entityId: args.entityId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
}
