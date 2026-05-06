"use client";

import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Global error boundary:", error);
  }, [error]);

  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center"
      style={{
        backgroundColor: "#020617",
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <p className="text-lg font-semibold text-red-300">
        Red-Flag runtime error
      </p>
      <p className="max-w-md text-sm opacity-90">
        The page crashed during rendering. Click reload and continue.
      </p>
      <p className="max-w-md text-xs opacity-80">{error.message}</p>
      <button
        type="button"
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
        onClick={() => {
          reset();
        }}
        style={{
          border: "none",
          cursor: "pointer",
        }}
      >
        Reload page
      </button>
    </main>
  );
}
