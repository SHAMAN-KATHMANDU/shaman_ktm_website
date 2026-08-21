import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  // Resolve the origin through the shared helper, the same way app/sitemap.ts
  // does. This file used to inline
  // `process.env.NEXT_PUBLIC_PROJECTX_ORIGIN ?? "https://shamankathmandu.com"`,
  // which could not see SITE_ORIGIN at all — so robots.txt advertised a
  // sitemap at the apex while the sitemap itself emitted www URLs, and the two
  // agreed only by coincidence. Inlining also carried two traps the helper
  // already solves: a NEXT_PUBLIC_* var is baked at BUILD time so the
  // container env cannot override it, and bare `??` lets a set-but-empty value
  // through where the helper's nonBlank() does not.
  const base = siteUrl;
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // /search builds its index by paging the products endpoint, so one
          // visit costs 3 concurrent inbound requests into this same
          // single-process server (lib/api/client.ts fetches localhost) and is
          // uncacheable — the root layout is force-dynamic. A crawler walking
          // it would multiply that, forever, for nothing: a results state has
          // no SEO value, nothing links to one, and the sitemap already
          // carries the real product URLs.
          "/search",
          "/sysuser",
          "/sysuser/",
          "/api/sysuser",
          "/api/sysuser/",
          "/account/",
          "/api/public/v1/reviews",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
