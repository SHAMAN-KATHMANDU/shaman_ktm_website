"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { FieldGrid } from "@/components/ui/section";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { StickySaveBar } from "@/components/ui/sticky-save-bar";
import { useUnsavedGuard } from "@/components/sysuser/use-unsaved-guard";
import { useToast } from "@/components/ui/toast";

interface State {
  enabled: boolean;
  message: string;
  href: string;
  bgColor: string;
  fgColor: string;
  dismissable: boolean;
}

const initial: State = {
  enabled: false,
  message: "",
  href: "",
  bgColor: "#c4a35a",
  fgColor: "#0a0806",
  dismissable: true,
};

export default function AnnouncementPage() {
  const toast = useToast();
  const [state, setState] = useState<State>(initial);
  const [snap, setSnap] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/sysuser/announcement")
      .then((r) => r.json())
      .then((j) => {
        const a = j.announcement ?? initial;
        const next: State = {
          enabled: a.enabled,
          message: a.message ?? "",
          href: a.href ?? "",
          bgColor: a.bgColor ?? "#c4a35a",
          fgColor: a.fgColor ?? "#0a0806",
          dismissable: a.dismissable ?? true,
        };
        setState(next);
        setSnap(JSON.stringify(next));
      });
  }, []);

  const dirty = JSON.stringify(state) !== snap;
  useUnsavedGuard(dirty);

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/sysuser/announcement", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...state, href: state.href || null }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Save failed");
      return;
    }
    setSnap(JSON.stringify(state));
    toast.success("Announcement saved");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Site" }, { label: "Announcement" }]}
        title="Announcement bar"
        description="Top-of-page strip. Toggle the “Announcement bar” module to make it appear publicly."
        actions={<Button onClick={save} loading={saving} disabled={!dirty}>Save</Button>}
      />

      <Card title="Live preview">
        {state.message ? (
          <div
            className="flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm"
            style={{ background: state.bgColor, color: state.fgColor }}
          >
            <span>{state.message}</span>
            {state.href && (
              <span className="font-medium underline">→</span>
            )}
            {state.dismissable && (
              <span className="opacity-50">×</span>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-base)] p-3 text-center text-xs opacity-50">
            Type a message to see the preview
          </div>
        )}
      </Card>

      <Card title="Content">
        <Field label="Message" required>
          <TextInput
            value={state.message}
            onChange={(e) => setState({ ...state, message: e.target.value })}
            placeholder="e.g. Free showroom pickup this weekend."
          />
        </Field>
        <div className="mt-4">
          <Field label="Optional link" hint="Wraps the message in an <a>.">
            <TextInput
              value={state.href}
              onChange={(e) => setState({ ...state, href: e.target.value })}
              placeholder="/bundles/shaman-starter"
            />
          </Field>
        </div>
      </Card>

      <Card title="Style">
        <FieldGrid cols={2}>
          <Field label="Background">
            <ColorPicker
              value={state.bgColor}
              onChange={(v) => setState({ ...state, bgColor: v })}
            />
          </Field>
          <Field label="Text color">
            <ColorPicker
              value={state.fgColor}
              onChange={(v) => setState({ ...state, fgColor: v })}
            />
          </Field>
        </FieldGrid>
      </Card>

      <Card title="Behavior">
        <Switch
          checked={state.dismissable}
          onChange={(v) => setState({ ...state, dismissable: v })}
          label="Allow visitors to dismiss"
          description="When on, an × appears and the bar stays hidden for that visitor."
        />
        <div className="mt-3">
          <Switch
            checked={state.enabled}
            onChange={(v) => setState({ ...state, enabled: v })}
            label="Enabled"
            description="Saved-but-disabled announcements never render. Module flag still controls public visibility."
          />
        </div>
      </Card>

      <StickySaveBar visible={dirty} saving={saving} onSave={save} />
    </div>
  );
}
