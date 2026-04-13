import Link from "next/link";

export function Logo({
  className = "sk-logo",
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  return (
    <Link
      href="/"
      className={className}
      data-variant={variant}
      aria-label="Shaman Kathmandu — home"
    >
      <span className="sk-logo-word">Shaman</span>
      <span className="sk-logo-rule" aria-hidden />
      <span className="sk-logo-caption">Kathmandu</span>
    </Link>
  );
}
