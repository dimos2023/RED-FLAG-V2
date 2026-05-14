"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMediaCapabilities } from "@/components/page-transition/use_media_capabilities";

const TransitionDepthCanvas = dynamic(
  () =>
    import("@/components/page-transition/transition_depth_canvas").then(
      (m) => m.TransitionDepthCanvas,
    ),
  { ssr: false, loading: () => null },
);

/**
 * Avoid CSS 3D transforms on the page wrapper: they create a containing block and
 * break `position: sticky` in SiteHeader. Depth comes from the lazy R3F layer instead.
 */
function buildVariants(rich: boolean): Variants {
  if (!rich) {
    return {
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
      },
      exit: {
        opacity: 0,
        transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
      },
    };
  }
  return {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      boxShadow:
        "0 0 0 1px rgba(248,113,113,0.1), 0 0 72px -24px rgba(239,68,68,0.2), 0 0 48px -18px rgba(34,211,238,0.06)",
      transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
    },
    exit: {
      opacity: 0,
      boxShadow: "0 0 0 0 transparent",
      transition: { duration: 0.24, ease: [0.45, 0, 0.85, 0.2] },
    },
  };
}

export function PageTransitionShell({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const pathname: string = usePathname();
  const { reducedMotion, allowHeavy3D, allow3DTransforms } =
    useMediaCapabilities();
  const [routeTick, setRouteTick] = useState<number>(0);
  const [canvasDeferred, setCanvasDeferred] = useState<boolean>(false);
  useEffect(() => {
    setRouteTick((n: number) => n + 1);
  }, [pathname]);
  useEffect(() => {
    if (!allowHeavy3D) {
      setCanvasDeferred(false);
      return;
    }
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(
        () => {
          setCanvasDeferred(true);
        },
        { timeout: 2400 },
      );
    } else {
      timeoutId = setTimeout(() => {
        setCanvasDeferred(true);
      }, 1200);
    }
    return () => {
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [allowHeavy3D]);
  const richMotion: boolean = allow3DTransforms && !reducedMotion;
  const variants: Variants = useMemo(
    () => buildVariants(richMotion),
    [richMotion],
  );
  const showCanvas: boolean = allowHeavy3D && canvasDeferred && !reducedMotion;
  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-slate-950">
      {showCanvas ? <TransitionDepthCanvas routeTick={routeTick} /> : null}
      <div className="relative z-10 min-h-dvh">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            className="min-h-dvh"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={variants}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
