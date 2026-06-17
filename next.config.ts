import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Pin the workspace root so dev (Turbopack) and build agree. Without this,
  // Next can infer the parent folder as the root, breaking module resolution.
  turbopack: {
    root: projectRoot,
  },
  // Emit a self-contained server bundle so the Docker image (Azure Container
  // Apps) ships only the runtime it needs. See Dockerfile / docs/azure-setup.md.
  output: "standalone",
};

export default nextConfig;
