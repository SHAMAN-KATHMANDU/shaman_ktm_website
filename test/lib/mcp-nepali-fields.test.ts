// Keeps the NE_FIELDS registry (lib/mcp/tools/nepali-fields.ts) in lockstep
// with prisma/schema.prisma: every *Ne column must be either reachable via
// set_nepali_fields or listed in NE_FIELDS_EXCLUDED. A new *Ne column added
// to the schema fails this test until it's classified.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  NE_FIELDS,
  NE_FIELDS_EXCLUDED,
} from "@/lib/mcp/tools/nepali-fields";

/** Parse `model X { … }` blocks and collect scalar field names per model. */
function parseSchemaFields(): Map<string, Set<string>> {
  const schema = readFileSync(
    path.resolve(__dirname, "../../prisma/schema.prisma"),
    "utf8",
  );
  const models = new Map<string, Set<string>>();
  const modelRe = /model\s+(\w+)\s+\{([^}]*)\}/g;
  for (const m of schema.matchAll(modelRe)) {
    const fields = new Set<string>();
    for (const line of m[2].split("\n")) {
      const fieldMatch = line.match(/^\s*(\w+)\s+\S+/);
      if (fieldMatch && !line.trim().startsWith("//")) {
        fields.add(fieldMatch[1]);
      }
    }
    models.set(m[1], fields);
  }
  return models;
}

const models = parseSchemaFields();

describe("mcp/nepali-fields registry", () => {
  it("references only models and fields that exist in the prisma schema", () => {
    for (const [entityType, entry] of Object.entries(NE_FIELDS)) {
      const fields = models.get(entityType);
      expect(fields, `model ${entityType} missing from schema`).toBeDefined();
      expect(fields).toContain(entry.idField);
      expect(fields).toContain(entry.labelField);
      for (const f of entry.fields) {
        expect(fields, `${entityType}.${f}`).toContain(f);
      }
    }
  });

  it("registers only *Ne field names", () => {
    for (const entry of Object.values(NE_FIELDS)) {
      for (const f of entry.fields) {
        expect(f.endsWith("Ne"), `${f} must end with "Ne"`).toBe(true);
      }
    }
  });

  it("classifies every *Ne column in the schema (registered or excluded)", () => {
    for (const [model, fields] of models) {
      for (const field of fields) {
        if (!field.endsWith("Ne")) continue;
        const registered = (
          NE_FIELDS[model as keyof typeof NE_FIELDS]?.fields as
            | readonly string[]
            | undefined
        )?.includes(field);
        const excluded = NE_FIELDS_EXCLUDED[model]?.includes(field);
        expect(
          registered || excluded,
          `${model}.${field} is neither registered in NE_FIELDS nor listed in NE_FIELDS_EXCLUDED`,
        ).toBe(true);
      }
    }
  });

  it("does not register excluded fields", () => {
    for (const [model, excludedFields] of Object.entries(NE_FIELDS_EXCLUDED)) {
      const entry = NE_FIELDS[model as keyof typeof NE_FIELDS];
      if (!entry) continue;
      for (const f of excludedFields) {
        expect(entry.fields).not.toContain(f);
      }
    }
  });
});
