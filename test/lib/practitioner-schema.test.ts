import { describe, it, expect } from "vitest";
import { PractitionerSchema } from "@/lib/validation/schemas";

describe("PractitionerSchema", () => {
  it("needs a name and a bio; defaults to published, no services", () => {
    const r = PractitionerSchema.parse({ name: "Asha", bio: "Plays the bowls." });
    expect(r.published).toBe(true);
    expect(r.serviceSlugs).toEqual([]);
    expect(PractitionerSchema.safeParse({ name: " ", bio: "x" }).success).toBe(false);
    expect(PractitionerSchema.safeParse({ name: "Asha", bio: "" }).success).toBe(false);
  });

  it("accepts an absolute or site-relative photo, or none", () => {
    for (const photoUrl of ["https://cdn.test/a.jpg", "/a.jpg", "", null, undefined]) {
      expect(PractitionerSchema.safeParse({ name: "A", bio: "b", photoUrl }).success).toBe(true);
    }
    expect(PractitionerSchema.safeParse({ name: "A", bio: "b", photoUrl: "javascript:alert(1)" }).success).toBe(false);
  });
});
