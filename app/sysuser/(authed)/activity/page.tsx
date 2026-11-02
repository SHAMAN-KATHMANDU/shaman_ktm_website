// Owner-only: the AdminLog audit trail (who changed what, across the whole CMS).
//
// Same reasoning as users/page.tsx — see components/sysuser/role-gate.tsx and
// lib/auth/page-guard.ts. Backing API: app/api/sysuser/activity/route.ts,
// requireRole("owner"), unchanged.

import { RoleGate } from "@/components/sysuser/role-gate";
import ActivityClient from "./activity-client";

export default function ActivityPage() {
  return (
    <RoleGate min="owner" title="Activity">
      <ActivityClient />
    </RoleGate>
  );
}
