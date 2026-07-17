import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep tracing rooted at this app even if a lockfile exists higher up.
  outputFileTracingRoot: path.join(path.dirname(fileURLToPath(import.meta.url))),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },
};

export default nextConfig;
