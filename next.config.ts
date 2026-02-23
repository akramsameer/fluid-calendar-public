import type { NextConfig } from "next";
import * as fs from "fs";
import * as path from "path";

/**
 * Detect if the SaaS submodule is present and populated
 * This allows automatic SaaS feature detection without manual env var configuration
 */
const detectSaasSubmodule = (): boolean => {
  try {
    const saasAppDir = path.join(process.cwd(), "saas", "app", "(saas)");
    return fs.existsSync(saasAppDir) && fs.readdirSync(saasAppDir).length > 0;
  } catch {
    return false;
  }
};

// Check for SaaS: either env var is set OR submodule is present
const hasSaasSubmodule = detectSaasSubmodule();
const isSaasEnabled =
  process.env.NEXT_PUBLIC_ENABLE_SAAS_FEATURES === "true" || hasSaasSubmodule;

// Log detection status during build
if (process.env.NODE_ENV !== "production" || process.env.NEXT_PHASE === "phase-production-build") {
  console.log(`\n[next.config] SaaS Detection:`);
  console.log(`  - Submodule present: ${hasSaasSubmodule}`);
  console.log(`  - Env var set: ${process.env.NEXT_PUBLIC_ENABLE_SAAS_FEATURES === "true"}`);
  console.log(`  - SaaS enabled: ${isSaasEnabled}\n`);
}

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  // Disable all development indicators
  devIndicators: false,

  // Enable standalone output for Docker deployment
  output: "standalone",

  // Expose SaaS detection to client-side code
  env: {
    NEXT_PUBLIC_HAS_SAAS: isSaasEnabled ? "true" : "false",
  },

  // Determine which file extensions to use based on SAAS enablement
  pageExtensions: (() => {
    // Base extensions
    const baseExtensions = ["js", "jsx", "ts", "tsx"];

    if (isSaasEnabled) {
      // For SAAS version, include .saas. files and exclude .open. files
      return [
        ...baseExtensions.map((ext) => ext),
        ...baseExtensions.map((ext) => `saas.${ext}`),
      ].filter((ext) => !ext.includes(".open."));
    } else {
      // For open source version, include .open. files and exclude .saas. files
      return [
        ...baseExtensions.map((ext) => ext),
        ...baseExtensions.map((ext) => `open.${ext}`),
      ].filter((ext) => !ext.includes(".saas."));
    }
  })(),

  // Webpack configuration for path aliases
  webpack: (config) => {
    // Add @saas/* path alias when submodule is present
    if (hasSaasSubmodule) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@saas": path.join(process.cwd(), "saas"),
      };
    }
    return config;
  },
};

export default nextConfig;
