import type { NextConfig } from "next";

const s3PublicHost = (() => {
  try {
    return process.env.S3_PUBLIC_BASE
      ? new URL(process.env.S3_PUBLIC_BASE).hostname
      : "ims-shaman-photos.s3.ap-south-1.amazonaws.com";
  } catch {
    return "ims-shaman-photos.s3.ap-south-1.amazonaws.com";
  }
})();

// Content-Security-Policy. Tightens default-src + locks images/iframes to
// the hosts we actually use. `'unsafe-inline'` is kept on script-src and
// style-src because Next.js inlines hydration and Tailwind injects styles
// at runtime — a stricter nonce-based CSP would require coordinating with
// next/script and the CSS pipeline.
//
// S3 hosts appear in three directives:
//   - img-src   → product / hero / OG images
//   - media-src → admin-uploaded video previews
//   - connect-src → admin's `fetch(presignedUrl, {method:"PUT"})` during
//                   /sysuser/media uploads. Without S3 here the browser
//                   blocks the upload at the CSP layer and the file
//                   silently never reaches the bucket.
const S3_HOSTS = [
  `https://${s3PublicHost}`,
  "https://*.s3.amazonaws.com",
  "https://*.s3.ap-south-1.amazonaws.com",
].join(" ");

const CSP = [
  "default-src 'self'",
  `img-src 'self' data: blob: ${S3_HOSTS} https://img.youtube.com https://i.vimeocdn.com https://www.google.com https://maps.gstatic.com`,
  `media-src 'self' blob: ${S3_HOSTS}`,
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  `connect-src 'self' ${S3_HOSTS} https://www.google-analytics.com`,
  "frame-src https://www.youtube.com https://player.vimeo.com https://www.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://wa.me",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: s3PublicHost },
      { protocol: "https", hostname: "*.s3.ap-south-1.amazonaws.com" },
      { protocol: "https", hostname: "*.s3.amazonaws.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.vimeocdn.com" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
