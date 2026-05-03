"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface NavItem {
  href: string;
  label: string;
}

const NAV: NavItem[] = [
  { href: "/sysuser", label: "Dashboard" },
  { href: "/sysuser/homepage", label: "Homepage" },
  { href: "/sysuser/blog", label: "Blog" },
  { href: "/sysuser/products", label: "Products" },
  { href: "/sysuser/bundles", label: "Bundles" },
  { href: "/sysuser/collections", label: "Collections" },
  { href: "/sysuser/categories", label: "Categories" },
  { href: "/sysuser/elements", label: "Elements" },
  { href: "/sysuser/services", label: "Services" },
  { href: "/sysuser/showrooms", label: "Showrooms" },
  { href: "/sysuser/pages", label: "Pages" },
  { href: "/sysuser/media", label: "Media" },
  { href: "/sysuser/site", label: "Site config" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<{ email?: string; name?: string | null } | null>(
    null,
  );

  useEffect(() => {
    fetch("/api/sysuser/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setMe(j?.user ?? null))
      .catch(() => setMe(null));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/sysuser/auth/logout", { method: "POST" });
    router.push("/sysuser/login");
  };

  return (
    <div className="min-h-screen bg-[var(--color-base)] text-[var(--color-cream)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center justify-between px-6 py-3">
          <Link href="/sysuser" className="font-display text-xl text-[var(--color-gold)]">
            Shaman CMS
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="opacity-70 hover:opacity-100">
              View site →
            </Link>
            {me?.email && <span className="opacity-70">{me.email}</span>}
            <button
              onClick={handleLogout}
              className="rounded border border-[var(--color-border)] px-3 py-1 hover:bg-[var(--color-base)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="flex">
        <nav className="w-56 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <ul className="space-y-1 text-sm">
            {NAV.map((item) => {
              const active =
                item.href === "/sysuser"
                  ? pathname === "/sysuser"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded px-3 py-2 ${
                      active
                        ? "bg-[var(--color-gold)] text-[var(--color-base)]"
                        : "hover:bg-[var(--color-base)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
