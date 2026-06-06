"use client";

import { usePathname } from "next/navigation";
import React from "react";

export default function InternalBackground(): JSX.Element | null {
  const pathname = usePathname();

  // treat root and Arabic root as the home page; do not render internal background there
  if (!pathname || pathname === "/" || pathname === "/ar") {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 bg-slate-950/95">
      <div
        className="absolute inset-0 bg-center bg-cover opacity-10"
        style={{ backgroundImage: "url('/site-background.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/5 to-black/30" />
    </div>
  );
}
