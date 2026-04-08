import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    // Force project root to this folder even if a parent directory has another package.json.
    root: projectRoot,
  },
  serverExternalPackages: ['@react-pdf/renderer'],
};

export default nextConfig;
