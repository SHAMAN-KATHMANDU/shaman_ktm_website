"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/sysuser/form";

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
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);

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

  const create = async () => {
    const slug = window.prompt("New post slug (lower-kebab-case):");
    if (!slug) return;
    const res = await fetch("/api/sysuser/blog/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        title: "Untitled",
        excerpt: "Add an excerpt.",
        bodyMarkdown: "# Untitled\n\nWrite your story here.",
        authorName: "Shaman Kathmandu",
        tags: [],
        readingMinutes: 3,
        status: "draft",
        isFeatured: false,
      }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      alert(j?.message ?? "Create failed");
      return;
    }
    const j = await res.json();
    window.location.href = `/sysuser/blog/${j.post.id}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Blog posts</h1>
        <Button onClick={create}>+ New post</Button>
      </div>
      {loading ? (
        <div className="opacity-60">Loading…</div>
      ) : (
        <div className="overflow-hidden rounded border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface)] text-left text-xs uppercase tracking-wider opacity-70">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Status</th>
                <th className="p-3">Featured</th>
                <th className="p-3">Category</th>
                <th className="p-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface)]"
                >
                  <td className="p-3">
                    <Link
                      href={`/sysuser/blog/${p.id}`}
                      className="text-[var(--color-gold)] hover:underline"
                    >
                      {p.title}
                    </Link>
                    <div className="text-xs opacity-60">{p.slug}</div>
                  </td>
                  <td className="p-3 capitalize">{p.status}</td>
                  <td className="p-3">{p.isFeatured ? "★" : "—"}</td>
                  <td className="p-3">{p.category?.name ?? "—"}</td>
                  <td className="p-3 text-xs opacity-60">
                    {new Date(p.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
