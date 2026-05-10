import path from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingRoot: path.join(__dirname, "../../"),
    outputFileTracingIncludes: {
      "/**": ["./.prisma/client/*.node"],
    },
  },
  transpilePackages: [
    "@orgos/db",
    "@orgos/shared-types",
    "@orgos/utils",
    "@orgos/ingestion-engine",
    "@orgos/metric-extraction",
    "@orgos/report-generator",
    "@orgos/dashboard-engine",
    "@orgos/intervention-engine",
    "@orgos/insight-engine",
    "@orgos/ui",
    "@orgos/anomaly-detection",
  ],
  webpack(config) {
    // Workspace packages use ESM-style .js extensions in TypeScript source.
    // Remap .js → .ts so webpack can resolve them during compilation.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
