import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { AppProviders } from "@/components/providers";
import InternalBackground from "@/components/InternalBackground";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  fallback: ["ui-monospace", "Consolas", "monospace"],
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "Red-Flag | Fraud Reporting & Verification",
  description:
    "Professional platform for verified fraud reporting and secure evidence handling.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabasePublic = getSupabasePublicEnv();
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans min-h-dvh text-slate-300 antialiased`}
        style={{
          color: "#cbd5e1",
          minHeight: "100dvh",
        }}
      >
        <AppProviders supabasePublic={supabasePublic}>
          <InternalBackground />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
