"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AuthProvider } from "@/contexts/auth-context";
import { LanguageProvider } from "@/contexts/language-context";

type BoundaryState = {
  hasError: boolean;
  message: string;
};

export class ProvidersErrorBoundary extends Component<
  { children: ReactNode },
  BoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(err: Error): BoundaryState {
    return { hasError: true, message: err.message };
  }

  override componentDidCatch(err: Error, info: ErrorInfo): void {
    console.error("Red-Flag render error:", err, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center"
          style={{
            backgroundColor: "#020617",
            color: "#e2e8f0",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <p className="text-lg font-semibold text-red-300">
            Something went wrong loading Red-Flag.
          </p>
          <p className="max-w-md text-sm opacity-90">{this.state.message}</p>
          <button
            type="button"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
            onClick={() => {
              window.location.reload();
            }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ProvidersErrorBoundary>
      <LanguageProvider>
        <AuthProvider>{children}</AuthProvider>
      </LanguageProvider>
    </ProvidersErrorBoundary>
  );
}
