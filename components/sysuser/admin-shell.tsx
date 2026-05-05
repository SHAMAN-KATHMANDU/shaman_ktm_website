"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  ListTree,
  LogOut,
  MapPin,
  Newspaper,
  Package,
  Palette,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Tag,
  ToggleRight,
  Wrench,
  History,
  Megaphone,
  ArrowRightLeft,
  Menu,
  X,
} from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { CommandPalette, type CommandItem } from "@/components/ui/command-palette";

type Group = {
  label: string;
  items: { href: string; label: string; icon: React.ReactNode }[];
};

const NAV: Group[] = [
  {
    label: "Workspace",
    items: [
      { href: "/sysuser", label: "Dashboard", icon: <LayoutDashboard size={14} /> },
      { href: "/sysuser/homepage", label: "Homepage", icon: <Home size={14} /> },
      { href: "/sysuser/modules", label: "Modules", icon: <ToggleRight size={14} /> },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/sysuser/products", label: "Products", icon: <Package size={14} /> },
      { href: "/sysuser/bundles", label: "Bundles", icon: <ShoppingBag size={14} /> },
      { href: "/sysuser/collections", label: "Collections", icon: <Boxes size={14} /> },
      { href: "/sysuser/categories", label: "Categories", icon: <ListTree size={14} /> },
      { href: "/sysuser/elements", label: "Elements", icon: <Sparkles size={14} /> },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/sysuser/blog", label: "Blog", icon: <Newspaper size={14} /> },
      { href: "/sysuser/blog/categories", label: "Blog categories", icon: <ListTree size={14} /> },
      { href: "/sysuser/blog/tags", label: "Blog tags", icon: <Tag size={14} /> },
      { href: "/sysuser/pages", label: "Pages", icon: <ListTree size={14} /> },
      { href: "/sysuser/services", label: "Services", icon: <Wrench size={14} /> },
      { href: "/sysuser/showrooms", label: "Showrooms", icon: <MapPin size={14} /> },
    ],
  },
  {
    label: "Site",
    items: [
      { href: "/sysuser/site", label: "Brand & SEO", icon: <Palette size={14} /> },
      { href: "/sysuser/announcement", label: "Announcement", icon: <Megaphone size={14} /> },
      { href: "/sysuser/redirects", label: "Redirects", icon: <ArrowRightLeft size={14} /> },
      { href: "/sysuser/media", label: "Media", icon: <ImageIcon size={14} /> },
      { href: "/sysuser/activity", label: "Activity", icon: <History size={14} /> },
    ],
  },
];

const FLAT_NAV = NAV.flatMap((g) => g.items);

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<{ email?: string; name?: string | null } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteItems, setPaletteItems] = useState<CommandItem[]>([]);

  // Close the mobile drawer on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const saved = window.localStorage.getItem("sk-admin-collapsed");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("sk-admin-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    fetch("/api/sysuser/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setMe(j?.user ?? null))
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    const navItems: CommandItem[] = FLAT_NAV.map((n) => ({
      id: `nav:${n.href}`,
      label: `Go to ${n.label}`,
      group: "Navigate",
      href: n.href,
    }));
    const actions: CommandItem[] = [
      {
        id: "act:new-blog",
        label: "+ New blog post",
        group: "Quick actions",
        href: "/sysuser/blog",
      },
      {
        id: "act:new-product",
        label: "+ New product",
        group: "Quick actions",
        href: "/sysuser/products",
      },
      {
        id: "act:new-page",
        label: "+ New page",
        group: "Quick actions",
        href: "/sysuser/pages",
      },
      {
        id: "act:view-site",
        label: "View public site →",
        group: "Quick actions",
        action: () => window.open("/", "_blank"),
      },
      {
        id: "act:logout",
        label: "Sign out",
        group: "Quick actions",
        action: async () => {
          await fetch("/api/sysuser/auth/logout", { method: "POST" });
          router.push("/sysuser/login");
        },
      },
    ];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPaletteItems([...navItems, ...actions]);
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/sysuser/auth/logout", { method: "POST" });
    router.push("/sysuser/login");
  };

  return (
    <div className="min-h-screen bg-[var(--color-base)] text-[var(--color-cream)]">
      <CommandPalette items={paletteItems} />

      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded p-1 opacity-60 transition hover:bg-[var(--color-base)] hover:opacity-100 md:hidden"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="hidden rounded p-1 opacity-60 transition hover:bg-[var(--color-base)] hover:opacity-100 md:inline-flex"
              aria-label="Toggle sidebar"
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
            <Link
              href="/sysuser"
              className="font-display text-xl text-[var(--color-gold)]"
            >
              Shaman CMS
            </Link>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new KeyboardEvent("keydown", {
                    key: "k",
                    metaKey: true,
                    ctrlKey: true,
                  }),
                )
              }
              className="hidden items-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-1 opacity-70 transition hover:opacity-100 md:inline-flex"
            >
              <Search size={12} />
              <span className="text-xs">Search</span>
              <Kbd>⌘K</Kbd>
            </button>
            <Link
              href="/"
              target="_blank"
              className="hidden items-center gap-1 opacity-70 transition hover:opacity-100 md:inline-flex"
            >
              View site <ArrowUpRight size={12} />
            </Link>
            {me?.email && (
              <div className="hidden items-center gap-2 md:flex">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-gold)]/20 text-[10px] font-medium uppercase text-[var(--color-gold)]">
                  {me.email[0]}
                </div>
                <span className="hidden text-xs opacity-70 lg:inline">
                  {me.email}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-base)]"
            >
              <LogOut size={12} />
              <span className="hidden md:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <nav
          className={`admin-scrollbar sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)]/40 transition-all md:block ${
            collapsed ? "w-14" : "w-56"
          }`}
        >
          <SidebarContents collapsed={collapsed} pathname={pathname} />
        </nav>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="admin-scrollbar absolute left-0 top-0 h-full w-64 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
                <span className="font-display text-lg text-[var(--color-gold)]">
                  Shaman CMS
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded p-1 opacity-60 hover:bg-[var(--color-base)] hover:opacity-100"
                  aria-label="Close menu"
                >
                  <X size={16} />
                </button>
              </div>
              <SidebarContents collapsed={false} pathname={pathname} />
            </aside>
          </div>
        )}

        <main className="admin-scrollbar min-w-0 flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContents({
  collapsed,
  pathname,
}: {
  collapsed: boolean;
  pathname: string;
}) {
  return (
    <div className="space-y-4 p-3">
      {NAV.map((group) => (
        <div key={group.label}>
          {!collapsed && (
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider opacity-50">
              {group.label}
            </div>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active =
                item.href === "/sysuser"
                  ? pathname === "/sysuser"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`relative flex items-center gap-2 rounded px-2 py-1.5 text-sm transition ${
                      active
                        ? "bg-[var(--color-base)] text-[var(--color-gold)]"
                        : "opacity-70 hover:bg-[var(--color-base)] hover:opacity-100"
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1 h-[calc(100%-0.5rem)] w-0.5 rounded-full bg-[var(--color-gold)]" />
                    )}
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {item.icon}
                    </span>
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {!collapsed && (
        <div className="border-t border-[var(--color-border)] pt-3 text-[10px] opacity-40">
          <Settings size={10} className="inline" /> v1 · Shaman CMS
        </div>
      )}
    </div>
  );
}
