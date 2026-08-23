// Server-side role gate for admin *pages*.
//
// Wrap a page's body in <RoleGate min="owner">…</RoleGate> and the body is
// never rendered for anyone below that rank; they get a plain "not available
// to your role" card inside the normal admin shell instead of an owner-only
// screen that 403s on every fetch.
//
// This is an async Server Component: `children` is a client element reference
// that React only commits when the gate passes, so nothing behind the gate
// mounts or fetches. It is NOT a replacement for requireRole() on the API —
// that remains the layer that actually protects the data. See
// lib/auth/page-guard.ts for why both layers exist.

import { Lock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getPageRole } from "@/lib/auth/page-guard";
import { roleAtLeast, type AdminRole } from "@/lib/auth/roles";

const LABEL: Record<AdminRole, string> = {
  owner: "Owner",
  editor: "Editor",
  staff: "Staff",
  viewer: "Viewer",
};

export async function RoleGate({
  min,
  title = "Not available",
  children,
}: {
  min: AdminRole;
  /** Heading shown on the refusal card; defaults to a generic one. */
  title?: string;
  children: React.ReactNode;
}) {
  const role = await getPageRole();
  if (role !== null && roleAtLeast(role, min)) return <>{children}</>;

  return (
    <>
      <PageHeader title={title} />
      <EmptyState
        icon={<Lock size={20} />}
        title={`${LABEL[min]} access required`}
        description={
          role === null
            ? "Your session could not be matched to an admin account. Sign out and sign in again."
            : `This screen is restricted to ${LABEL[min].toLowerCase()} accounts. You are signed in as ${LABEL[role].toLowerCase()}. Ask an owner if you need access.`
        }
      />
    </>
  );
}
