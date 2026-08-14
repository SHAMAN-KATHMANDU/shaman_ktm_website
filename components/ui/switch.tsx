"use client";

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  size = "md",
}: SwitchProps) {
  const w = size === "sm" ? "w-9" : "w-11";
  const h = size === "sm" ? "h-5" : "h-6";
  const knob = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const translate = size === "sm" ? "translate-x-4" : "translate-x-5";

  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex ${w} ${h} shrink-0 items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? "border-accent bg-accent"
          : "border-line bg-line"
      }`}
    >
      <span
        className={`${knob} inline-block transform rounded-full bg-bone shadow transition ${
          checked ? translate : "translate-x-0.5"
        }`}
      />
    </button>
  );

  if (!label && !description) return toggle;

  return (
    <label
      className={`flex cursor-pointer items-start gap-3 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      {toggle}
      <div className="flex-1">
        {label && (
          <div className="text-sm font-medium text-ink">
            {label}
          </div>
        )}
        {description && (
          <div className="text-xs text-ink-soft">{description}</div>
        )}
      </div>
    </label>
  );
}
