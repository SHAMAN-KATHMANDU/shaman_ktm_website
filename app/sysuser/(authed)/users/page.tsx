// Owner-only: admin account management (create/edit/delete AdminUser rows).
//
// The gate is here, on the server, and not only in the nav: proxy.ts admits
// any request carrying the sk_sysuser cookie without reading the role, so
// before this wrapper existed a viewer who typed /sysuser/users got the whole
// screen and it simply 403'd on every fetch. The API
// (app/api/sysuser/users/route.ts, requireRole("owner")) is unchanged and is
// still the layer that protects the data — this is the second lock.

import { RoleGate } from "@/components/sysuser/role-gate";
import UsersClient from "./users-client";

export default function UsersPage() {
  return (
    <RoleGate min="owner" title="Team">
      <UsersClient />
    </RoleGate>
  );
}
