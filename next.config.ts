import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // the WASM Postgres used for local dev must not be bundled
  serverExternalPackages: ["@electric-sql/pglite"],
  images: {
    // proof screenshots live in Vercel Blob; every store gets its own subdomain
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
};

export default nextConfig;
