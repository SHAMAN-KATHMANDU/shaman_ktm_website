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
