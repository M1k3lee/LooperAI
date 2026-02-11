import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: 'export',
  basePath: '/LooperAI',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
