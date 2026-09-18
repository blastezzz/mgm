import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // the WASM Postgres used for local dev must not be bundled
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
