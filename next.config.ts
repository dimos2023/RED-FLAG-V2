import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { getSupabasePublicEnv } from "./src/lib/supabase/env";

loadEnvConfig(process.cwd());

const supabasePublic = getSupabasePublicEnv();
const nextPublicEnv: Record<string, string> = supabasePublic
  ? {
      NEXT_PUBLIC_SUPABASE_URL: supabasePublic.url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabasePublic.anonKey,
    }
  : {};

const nextConfig: NextConfig = {
  env: nextPublicEnv,
  reactStrictMode: true,
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:3004",
    "http://localhost:3005",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003",
    "http://127.0.0.1:3004",
    "http://127.0.0.1:3005",
    "http://100.101.99.47:3000",
    "http://100.101.99.47:3001",
    "http://100.101.99.47:3002",
    "http://100.101.99.47:3003",
    "http://100.101.99.47:3004",
    "http://100.101.99.47:3005",
  ],
  experimental: {
    // Workaround for intermittent Next.js 15 devtools bundler crashes
    // (SegmentViewNode missing from React Client Manifest).
    devtoolSegmentExplorer: false,
    browserDebugInfoInTerminal: false,
  },
};

export default nextConfig;
