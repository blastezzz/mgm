import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // native SQLite bindings must stay out of the bundle
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
