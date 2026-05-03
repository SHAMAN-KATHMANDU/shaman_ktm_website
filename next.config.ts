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

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: s3PublicHost },
      { protocol: "https", hostname: "*.s3.ap-south-1.amazonaws.com" },
      { protocol: "https", hostname: "*.s3.amazonaws.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.vimeocdn.com" },
    ],
  },
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
