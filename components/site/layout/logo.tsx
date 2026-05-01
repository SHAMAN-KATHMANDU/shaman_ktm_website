import Link from "next/link";

export function Logo({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "text-xl" : size === "sm" ? "text-sm" : "text-base";
  return (
    <Link
      href="/"
      className={`inline-flex flex-col leading-none text-[var(--color-gold)] ${className}`}
      aria-label="Shaman Kathmandu — home"
    >
      <span
        className={`font-display ${sizeClass} tracking-[0.4em] uppercase`}
      >
        Shaman
      </span>
      <span
        className="font-body text-[9px] tracking-[0.3em] uppercase text-[var(--color-gold-muted)] mt-0.5"
      >
        Kathmandu
      </span>
    </Link>
  );
}
