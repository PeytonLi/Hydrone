import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hydrone/core", "@hydrone/llm-service"],
  serverExternalPackages: ["@hydradb/sdk"],
};

export default nextConfig;
