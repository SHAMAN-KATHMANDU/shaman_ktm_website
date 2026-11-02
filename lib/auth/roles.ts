// Single definition of the admin role ladder, shared by the HTTP guard
// (lib/auth/guard.ts) and the MCP token guard (lib/mcp/respond.ts) so the two
// can never drift apart. Dependency-free on purpose — importable from any
// runtime, including the Edge middleware bundle.
//
// owner ⊃ editor ⊃ staff ⊃ viewer:
//   owner  — user management + everything else
//   editor — content CRUD, lookups, tier/config data
//   staff  — reporting/operations entry (CRM, sales, stock, footfall)
//   viewer — read-only

export type AdminRole = "owner" | "editor" | "staff" | "viewer";

export const ROLE_RANK: Record<AdminRole, number> = {
  viewer: 1,
  staff: 2,
  editor: 3,
  owner: 4,
};

/** True when `role` satisfies the `min` requirement. */
export function roleAtLeast(role: AdminRole, min: AdminRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}
