import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003",
    "http://100.101.99.47:3000",
    "http://100.101.99.47:3002",
    "http://100.101.99.47:3003",
  ],
  experimental: {
    // Workaround for intermittent Next.js 15 devtools bundler crashes
    // (SegmentViewNode missing from React Client Manifest).
    devtoolSegmentExplorer: false,
    browserDebugInfoInTerminal: false,
  },
};

export default nextConfig;
