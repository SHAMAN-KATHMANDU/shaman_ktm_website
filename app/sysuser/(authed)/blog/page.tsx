"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Newspaper, Plus, Search, Star } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { prompt as askPrompt } from "@/components/ui/prompt";
import { slugifyLite } from "@/components/ui/slug-input";

interface PostRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  isFeatured: boolean;
  publishedAt: string | null;
  updatedAt: string;
  category: { name: string } | null;
}

export default function BlogListPage() {
  const toast = useToast();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const reload = async () => {
    setLoading(true);
    const res = await fetch("/api/sysuser/blog/posts");
    const j = await res.json();
    setPosts(j.posts ?? []);
    setLoading(false);
  };
  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return posts;
    const q = search.toLowerCase();
    return posts.filter(
      (p) => p.title.toLowerCase().includes(q) || p.slug.includes(q),
    );
  }, [posts, search]);

  const create = async () => {
    const title = await askPrompt({
      title: "New blog post",
      label: "Title",
      placeholder: "e.g. Shaman Stories: Episode 02",
      validate: (v) => (v ? null : "Title is required"),
    });
    if (!title) return;
    const slug = slugifyLite(title);
    const res = await fetch("/api/sysuser/blog/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        title,
        excerpt: "",
        bodyMarkdown: `# ${title}\n\nWrite your story here.`,
        authorName: "Shaman Kathmandu",
        tags: [],
        readingMinutes: 3,
        status: "draft",
        isFeatured: false,
      }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      toast.error("Create failed", j?.message ?? undefined);
      return;
    }
    const j = await res.json();
    window.location.href = `/sysuser/blog/${j.post.id}`;
  };

  const columns: Column<PostRow>[] = [
    {
      key: "title",
      header: "Title",
      render: (p) => (
        <>
          <Link
            href={`/sysuser/blog/${p.id}`}
            className="text-[var(--color-gold)] hover:underline"
          >
            {p.title}
          </Link>
          <div className="text-[10px] opacity-50">{p.slug}</div>
        </>
      ),
    },
    {
      key: "category",
      header: "Category",
      width: "180px",
      render: (p) => p.category?.name ?? "—",
    },
    {
      key: "flags",
      header: "Flags",
      width: "120px",
      render: (p) =>
        p.isFeatured ? (
          <Badge tone="gold" icon={<Star size={10} />}>
            Featured
          </Badge>
        ) : null,
    },
    {
      key: "status",
      header: "Status",
      width: "120px",
      render: (p) => (
        <Badge tone={p.status === "published" ? "success" : "muted"}>
          {p.status}
        </Badge>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      width: "160px",
      render: (p) => (
        <span className="text-xs opacity-60">
          {new Date(p.updatedAt).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Content" }, { label: "Blog" }]}
        title="Blog posts"
        description="Stories rendered at /stories. Featured posts can be promoted on the home page."
        actions={
          <Button onClick={create} icon={<Plus size={12} />}>
            New post
          </Button>
        }
      />

      <Card>
        <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-1.5">
          <Search size={14} className="opacity-50" />
          <input
            placeholder="Search by title or slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </div>
      </Card>

      {loading ? (
        <div className="opacity-60">Loading…</div>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(p) => p.id}
          empty={
            <EmptyState
              icon={<Newspaper size={20} />}
              title="No blog posts yet"
              description="Tell a story. The first post can use a featured video on the home page."
              action={
                <Button onClick={create} icon={<Plus size={12} />}>
                  New post
                </Button>
              }
            />
          }
        />
      )}
    </div>
  );
}
