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
  // Emit a self-contained server bundle ONLY for the Docker image (Azure
  // Container Apps), which sets DOCKER_BUILD=1. On Vercel the variable is
  // absent, so Next uses its default output. See Dockerfile / docs/azure-setup.md.
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
};

export default nextConfig;
