import type { NextConfig } from "next";
import * as fs from "fs";
import * as path from "path";

/**
 * Detect if the SaaS submodule is present and populated
 */
const detectSaasSubmodule = (): boolean => {
  try {
    const saasAppDir = path.join(process.cwd(), "saas", "app", "(saas)");
    return fs.existsSync(saasAppDir) && fs.readdirSync(saasAppDir).length > 0;
  } catch {
    return false;
  }
};

const hasSaasSubmodule = detectSaasSubmodule();

// Respect explicit env var override. When NEXT_PUBLIC_ENABLE_SAAS_FEATURES is
// explicitly "false" (e.g. build:os), disable SaaS even if submodule is present.
const isExplicitlyDisabled =
  process.env.NEXT_PUBLIC_ENABLE_SAAS_FEATURES === "false";
const isSaasEnabled =
  !isExplicitlyDisabled &&
  (process.env.NEXT_PUBLIC_ENABLE_SAAS_FEATURES === "true" ||
    hasSaasSubmodule);

// Log detection status during build
if (
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PHASE === "phase-production-build"
) {
  console.log(`\n[next.config] SaaS Detection:`);
  console.log(`  - Submodule present: ${hasSaasSubmodule}`);
  console.log(
    `  - Env var: ${process.env.NEXT_PUBLIC_ENABLE_SAAS_FEATURES ?? "(not set)"}`
  );
  console.log(`  - SaaS enabled: ${isSaasEnabled}\n`);
}

const nextConfig: NextConfig = {
  // Disable all development indicators
  devIndicators: false,

  // Enable standalone output for Docker deployment
  output: "standalone",

  // Expose SaaS detection to client-side code
  env: {
    NEXT_PUBLIC_HAS_SAAS: isSaasEnabled ? "true" : "false",
  },

  // Standard page extensions only — no .saas. or .open. suffixes needed.
  // SaaS content is provided via symlinks from setup-saas.ts when the submodule is present.
  pageExtensions: ["js", "jsx", "ts", "tsx"],

  // Webpack configuration for path aliases
  webpack: (config) => {
    // Add @saas/* path alias only when SaaS is enabled
    if (isSaasEnabled && hasSaasSubmodule) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@saas": path.join(process.cwd(), "saas"),
      };
    }
    return config;
  },
};

export default nextConfig;
