"use client";

import { useEffect, useState } from "react";
import { Button, Field, TextInput } from "@/components/sysuser/form";

interface Row {
  slug: string;
  name: string;
  icon: string;
  accent: string;
  natureSource: string;
  energyDescription: string;
  position: number;
}

export default function ElementsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const res = await fetch("/api/sysuser/elements");
    const j = await res.json();
    setRows(j.elements ?? []);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  const save = async (row: Row) => {
    await fetch(`/api/sysuser/elements/${row.slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
  };

  if (loading) return <div className="opacity-60">Loading…</div>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Elements</h1>
      <p className="text-sm opacity-60">
        The six nature elements that drive the home grid and product groupings.
      </p>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div
            key={row.slug}
            className="grid gap-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            style={{ borderLeft: `4px solid ${row.accent}` }}
          >
            <div className="grid gap-3 md:grid-cols-[100px_1fr_80px_120px_60px_auto]">
              <Field label="Slug">
                <TextInput value={row.slug} readOnly />
              </Field>
              <Field label="Name">
                <TextInput
                  value={row.name}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...row, name: e.target.value };
                    setRows(next);
                  }}
                />
              </Field>
              <Field label="Icon">
                <TextInput
                  value={row.icon}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...row, icon: e.target.value };
                    setRows(next);
                  }}
                />
              </Field>
              <Field label="Accent (hex)">
                <TextInput
                  value={row.accent}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...row, accent: e.target.value };
                    setRows(next);
                  }}
                />
              </Field>
              <Field label="Pos">
                <TextInput
                  type="number"
                  value={row.position}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...row, position: Number(e.target.value) || 0 };
                    setRows(next);
                  }}
                />
              </Field>
              <div className="flex items-end">
                <Button onClick={() => save(row)}>Save</Button>
              </div>
            </div>
            <Field label="Nature source">
              <TextInput
                value={row.natureSource}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...row, natureSource: e.target.value };
                  setRows(next);
                }}
              />
            </Field>
            <Field label="Energy description">
              <TextInput
                value={row.energyDescription}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...row, energyDescription: e.target.value };
                  setRows(next);
                }}
              />
            </Field>
          </div>
        ))}
      </div>
    </div>
  );
}
