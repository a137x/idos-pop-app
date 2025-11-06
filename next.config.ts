import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Set the correct root for this standalone app
  outputFileTracingRoot: path.join(__dirname),

  // Enable standalone output for Docker
  output: "standalone",

  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default nextConfig;
