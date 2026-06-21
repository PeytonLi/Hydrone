import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hydrone/core", "@hydrone/llm-service"],
  serverExternalPackages: ["@hydradb/sdk", "@ai-sdk/anthropic", "ai", "pg"],
};

export default nextConfig;
