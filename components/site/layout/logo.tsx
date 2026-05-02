import Image from "next/image";
import Link from "next/link";

const SIZE_PX: Record<"sm" | "md" | "lg", number> = {
  sm: 28,
  md: 40,
  lg: 72,
};

export function Logo({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const px = SIZE_PX[size];
  return (
    <Link
      href="/"
      className={`inline-flex items-center ${className}`}
      aria-label="Shaman Kathmandu — home"
    >
      <Image
        src="/logo.png"
        alt="Shaman Kathmandu"
        width={px}
        height={px}
        priority={size !== "sm"}
        className="block"
        style={{ height: px, width: "auto" }}
      />
    </Link>
  );
}
