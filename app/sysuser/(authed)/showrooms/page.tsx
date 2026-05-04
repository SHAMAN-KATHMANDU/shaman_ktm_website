"use client";

import { useEffect, useState } from "react";
import { Button, Field, TextInput, Textarea } from "@/components/sysuser/form";

interface Row {
  key: string;
  name: string;
  address: string;
  whatsapp: string;
  mapEmbedUrl: string | null;
  position: number;
}

export default function ShowroomsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const res = await fetch("/api/sysuser/showrooms");
    const j = await res.json();
    setRows(j.showrooms ?? []);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  const save = async (row: Row) => {
    await fetch(`/api/sysuser/showrooms/${row.key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
  };

  const create = async () => {
    const key = window.prompt("Showroom key (e.g. thamel):");
    if (!key) return;
    await fetch("/api/sysuser/showrooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        name: key,
        address: "",
        whatsapp: "",
        mapEmbedUrl: "",
        position: rows.length,
      }),
    });
    reload();
  };

  const remove = async (key: string) => {
    if (!confirm(`Delete showroom “${key}”?`)) return;
    await fetch(`/api/sysuser/showrooms/${key}`, { method: "DELETE" });
    reload();
  };

  if (loading) return <div className="opacity-60">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl">Showrooms</h1>
        <Button onClick={create}>+ New</Button>
      </div>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div
            key={row.key}
            className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Key">
                <TextInput value={row.key} readOnly />
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
            </div>
            <Field label="Address">
              <Textarea
                rows={2}
                value={row.address}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...row, address: e.target.value };
                  setRows(next);
                }}
              />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="WhatsApp (E.164, no +)">
                <TextInput
                  value={row.whatsapp}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...row, whatsapp: e.target.value };
                    setRows(next);
                  }}
                />
              </Field>
              <Field label="Position">
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
            </div>
            <Field label="Google Maps embed URL">
              <Textarea
                rows={2}
                value={row.mapEmbedUrl ?? ""}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...row, mapEmbedUrl: e.target.value || null };
                  setRows(next);
                }}
              />
            </Field>
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="danger" onClick={() => remove(row.key)}>
                Delete
              </Button>
              <Button onClick={() => save(row)}>Save</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
