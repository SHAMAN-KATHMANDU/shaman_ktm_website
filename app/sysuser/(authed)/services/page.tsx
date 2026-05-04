"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/sysuser/form";

interface Row {
  slug: string;
  name: string;
  element: string;
  duration: string;
  pricePerSession: number;
}

export default function ServicesListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const res = await fetch("/api/sysuser/services");
    const j = await res.json();
    setRows(j.services ?? []);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  const create = async () => {
    const slug = window.prompt("Service slug:");
    if (!slug) return;
    const name = window.prompt("Name:") ?? slug;
    await fetch("/api/sysuser/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        name,
        element: "metal",
        duration: "60 min",
        pricePerSession: 0,
        summary: "",
        whatToExpect: [],
        relatedProductSlugs: [],
      }),
    });
    window.location.href = `/sysuser/services/${slug}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl">Services</h1>
        <Button onClick={create}>+ New service</Button>
      </div>
      {loading ? (
        <div className="opacity-60">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded border border-[var(--color-border)]">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-[var(--color-surface)] text-left text-xs uppercase tracking-wider opacity-70">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Element</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Price</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr
                  key={s.slug}
                  className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface)]"
                >
                  <td className="p-3">
                    <Link
                      href={`/sysuser/services/${s.slug}`}
                      className="text-[var(--color-gold)] hover:underline"
                    >
                      {s.name}
                    </Link>
                    <div className="text-xs opacity-60">{s.slug}</div>
                  </td>
                  <td className="p-3 capitalize">{s.element}</td>
                  <td className="p-3">{s.duration}</td>
                  <td className="p-3">
                    NPR {s.pricePerSession.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
