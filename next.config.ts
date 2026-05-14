import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { getSupabasePublicEnv } from "./src/lib/supabase/env";

loadEnvConfig(process.cwd());

const supabasePublic = getSupabasePublicEnv();
const nextPublicEnv: Record<string, string> | undefined = supabasePublic
  ? {
      NEXT_PUBLIC_SUPABASE_URL: supabasePublic.url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabasePublic.anonKey,
    }
  : undefined;

const VERCEL_FEEDBACK_ORIGINS: string = "https://vercel.live https://vercel.com";

const supabaseConnectOrigin: string = supabasePublic?.url
  ? new URL(supabasePublic.url).origin
  : "";

/** Tesseract.js (OCR) uses blob workers; Vercel Toolbar / Feedback needs vercel.* in script/connect/frame. */
const CONTENT_SECURITY_POLICY: string = [
  `script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: ${VERCEL_FEEDBACK_ORIGINS}`,
  [
    "connect-src",
    "'self'",
    "blob:",
    "data:",
    VERCEL_FEEDBACK_ORIGINS,
    supabaseConnectOrigin,
    "https://*.supabase.co",
    "wss://*.supabase.co",
  ]
    .filter((token: string) => token.length > 0)
    .join(" "),
  `frame-src 'self' ${VERCEL_FEEDBACK_ORIGINS}`,
  "worker-src 'self' blob:",
].join("; ");

const nextConfig: NextConfig = {
  ...(nextPublicEnv ? { env: nextPublicEnv } : {}),
  async redirects() {
    return [
      { source: "/admin-login", destination: "/login", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: CONTENT_SECURITY_POLICY,
          },
        ],
      },
    ];
  },
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
