import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // App lives in web/; repo-root lockfile must not become the Turbopack root.
  turbopack: {
    root: projectRoot,
  },
  serverExternalPackages: ["onnxruntime-node", "sharp"],
};

export default nextConfig;
