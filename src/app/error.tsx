"use client";

import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Route error boundary:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-bold text-red-300">Unexpected error</h1>
      <p className="max-w-2xl text-sm text-slate-300">
        The page failed to render. You can retry without losing your session.
      </p>
      <p className="text-xs text-slate-500">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
      >
        Try again
      </button>
    </main>
  );
}
