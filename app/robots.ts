import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXT_PUBLIC_PROJECTX_ORIGIN ?? "https://shamankathmandu.com";
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
    sitemap: `${base.replace(/\/+$/, "")}/sitemap.xml`,
  };
}
