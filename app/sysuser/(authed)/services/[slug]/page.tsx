"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Field,
  Select,
  TextInput,
  Textarea,
} from "@/components/sysuser/form";

interface State {
  slug: string;
  name: string;
  element: "metal" | "earth" | "wood" | "plant" | "water" | "air";
  duration: string;
  pricePerSession: number;
  hero: string;
  summary: string;
  whatToExpect: string;
  relatedProductSlugs: string;
  position: number;
}

export default function ServiceEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sysuser/services")
      .then((r) => r.json())
      .then((j) => {
        const s = (j.services as Array<State & Record<string, unknown>>).find(
          (x) => x.slug === slug,
        );
        if (s) {
          setState({
            slug: s.slug,
            name: s.name,
            element: s.element,
            duration: s.duration,
            pricePerSession: s.pricePerSession,
            hero: (s.hero as string) ?? "",
            summary: s.summary,
            whatToExpect: ((s.whatToExpect as string[]) ?? []).join("\n"),
            relatedProductSlugs: (
              (s.relatedProductSlugs as string[]) ?? []
            ).join(", "),
            position: (s.position as number) ?? 0,
          });
        }
      });
  }, [slug]);

  if (!state) return <div className="opacity-60">Loading…</div>;

  const save = async () => {
    setError(null);
    const res = await fetch(`/api/sysuser/services/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: state.slug,
        name: state.name,
        element: state.element,
        duration: state.duration,
        pricePerSession: state.pricePerSession,
        hero: state.hero || null,
        summary: state.summary,
        whatToExpect: state.whatToExpect
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        relatedProductSlugs: state.relatedProductSlugs
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        position: state.position,
      }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(j?.message ?? "Save failed");
    }
  };

  const remove = async () => {
    if (!confirm("Delete this service?")) return;
    await fetch(`/api/sysuser/services/${slug}`, { method: "DELETE" });
    router.push("/sysuser/services");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Edit service</h1>
        <div className="flex gap-2">
          <Button variant="danger" onClick={remove}>
            Delete
          </Button>
          <Button onClick={save}>Save</Button>
        </div>
      </div>
      {error && (
        <div className="rounded bg-[var(--color-danger)]/20 p-3 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name">
          <TextInput
            value={state.name}
            onChange={(e) => setState({ ...state, name: e.target.value })}
          />
        </Field>
        <Field label="Element">
          <Select
            value={state.element}
            onChange={(e) =>
              setState({
                ...state,
                element: e.target.value as State["element"],
              })
            }
          >
            {["metal", "earth", "wood", "plant", "water", "air"].map((el) => (
              <option key={el} value={el}>
                {el}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Duration">
          <TextInput
            value={state.duration}
            onChange={(e) => setState({ ...state, duration: e.target.value })}
          />
        </Field>
        <Field label="Price per session (NPR)">
          <TextInput
            type="number"
            value={state.pricePerSession}
            onChange={(e) =>
              setState({
                ...state,
                pricePerSession: Number(e.target.value) || 0,
              })
            }
          />
        </Field>
        <Field label="Position">
          <TextInput
            type="number"
            value={state.position}
            onChange={(e) =>
              setState({ ...state, position: Number(e.target.value) || 0 })
            }
          />
        </Field>
      </div>
      <Field label="Hero image URL">
        <TextInput
          value={state.hero}
          onChange={(e) => setState({ ...state, hero: e.target.value })}
        />
      </Field>
      <Field label="Summary">
        <Textarea
          rows={3}
          value={state.summary}
          onChange={(e) => setState({ ...state, summary: e.target.value })}
        />
      </Field>
      <Field label="What to expect" hint="One bullet per line.">
        <Textarea
          rows={5}
          value={state.whatToExpect}
          onChange={(e) =>
            setState({ ...state, whatToExpect: e.target.value })
          }
        />
      </Field>
      <Field label="Related product slugs" hint="Comma-separated.">
        <TextInput
          value={state.relatedProductSlugs}
          onChange={(e) =>
            setState({ ...state, relatedProductSlugs: e.target.value })
          }
        />
      </Field>
    </div>
  );
}
