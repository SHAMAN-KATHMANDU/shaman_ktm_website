// The role ladder gained "staff" between viewer and editor. Inserting a rank
// silently changes what every existing requireRole()/requireMcpRole() gate
// admits, so the ordering itself is pinned here: reporting staff must be able
// to enter operations data without gaining any content-CMS or user-management
// power.

import { describe, expect, it } from "vitest";
import { ROLE_RANK, roleAtLeast, type AdminRole } from "@/lib/auth/roles";

const LADDER: AdminRole[] = ["viewer", "staff", "editor", "owner"];

describe("role ladder", () => {
  it("is strictly ordered viewer < staff < editor < owner", () => {
    const ranks = LADDER.map((r) => ROLE_RANK[r]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(new Set(ranks).size).toBe(LADDER.length);
  });

  it("lets every role satisfy itself and everything below it", () => {
    LADDER.forEach((role, i) => {
      LADDER.slice(0, i + 1).forEach((min) => {
        expect(roleAtLeast(role, min)).toBe(true);
      });
    });
  });

  it("keeps staff out of editor- and owner-gated surfaces", () => {
    // Content CRUD (products, pages, lookups) and user management.
    expect(roleAtLeast("staff", "editor")).toBe(false);
    expect(roleAtLeast("staff", "owner")).toBe(false);
  });

  it("lets staff through staff-gated reporting entry, and viewer not", () => {
    expect(roleAtLeast("staff", "staff")).toBe(true);
    expect(roleAtLeast("viewer", "staff")).toBe(false);
  });

  it("still admits editor and owner everywhere staff is allowed", () => {
    expect(roleAtLeast("editor", "staff")).toBe(true);
    expect(roleAtLeast("owner", "staff")).toBe(true);
  });

  it("keeps viewer read-only — the MCP vault-sync role", () => {
    expect(roleAtLeast("viewer", "viewer")).toBe(true);
    (["staff", "editor", "owner"] as AdminRole[]).forEach((min) => {
      expect(roleAtLeast("viewer", min)).toBe(false);
    });
  });
});
