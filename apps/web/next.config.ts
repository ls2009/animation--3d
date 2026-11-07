import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@sinaa/engine", "@sinaa/dsl"],
};

export default nextConfig;
