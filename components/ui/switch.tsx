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
  // Square track, square knob: 2px inset, slides the full inner width.
  const knob = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const translate = size === "sm" ? "translate-x-5" : "translate-x-6";

  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex ${w} ${h} shrink-0 items-center border transition-colors duration-300 ease-lux disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? "border-metal-deep bg-metal-deep"
          : "border-line bg-cream hover:border-metal"
      }`}
    >
      <span
        className={`${knob} inline-block transform transition-[transform,background-color] duration-300 ease-lux ${
          checked ? `${translate} bg-bone` : "translate-x-0.5 bg-ink-soft/50"
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
