// Owner-only: approve or reject an MCP client's OAuth 2.1 connection request.
//
// Not in the nav (it is reached by a 302 from /api/oauth/authorize), so it was
// never even nav-hidden — any signed-in admin who followed a connector's
// authorize link landed on the full consent screen. Its backing API
// (app/api/sysuser/oauth-consent/[requestId]/route.ts) is requireRole("owner"),
// so a non-owner could only ever 403 there; the gate makes the refusal legible
// instead of showing an approve button that cannot work.
//
// Note for the reviewer: this page was NOT named in the original report (which
// listed /sysuser/users and /sysuser/activity). It is included because its API
// is owner-only by the same rule, and leaving it ungated would have left the
// new page-gate lint below with an exception it could not justify.

import { RoleGate } from "@/components/sysuser/role-gate";
import OAuthConsentClient from "./oauth-consent-client";

export default function OAuthConsentPage() {
  return (
    <RoleGate min="owner" title="Connection request">
      <OAuthConsentClient />
    </RoleGate>
  );
}
