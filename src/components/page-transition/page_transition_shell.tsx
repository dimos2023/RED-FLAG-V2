"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { playPageTurnSound } from "@/lib/audio/page_turn_sound";
import { useMediaCapabilities } from "@/components/page-transition/use_media_capabilities";

const TransitionDepthCanvas = dynamic(
  () =>
    import("@/components/page-transition/transition_depth_canvas").then(
      (m) => m.TransitionDepthCanvas,
    ),
  { ssr: false, loading: () => null },
);

/**
 * Rich route transitions: 3D book-flip (rotateY + perspective) with neon edge glow.
 * SiteHeader portals to `document.body` so `position: fixed` / stacking are not broken
 * by this subtree’s transforms.
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
  const neonEdge: string =
    "0 0 0 1px rgba(248,113,113,0.4), 0 0 48px -4px rgba(239,68,68,0.5), 0 0 40px -8px rgba(59,130,246,0.42), inset 0 0 32px rgba(248,113,113,0.14)";
  return {
    initial: {
      rotateY: 86,
      opacity: 0.12,
      boxShadow: neonEdge,
    },
    animate: {
      rotateY: 0,
      opacity: 1,
      boxShadow:
        "0 0 0 1px rgba(248,113,113,0.06), 0 0 56px -28px rgba(239,68,68,0.14), 0 0 40px -24px rgba(34,211,238,0.08)",
      transition: { duration: 0.54, ease: [0.22, 1, 0.36, 1] },
    },
    exit: {
      rotateY: -88,
      opacity: 0.22,
      boxShadow: neonEdge,
      transition: { duration: 0.46, ease: [0.45, 0, 0.85, 0.2] },
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
  const skipSoundRef = useRef<boolean>(true);
  useEffect(() => {
    setRouteTick((n: number) => n + 1);
  }, [pathname]);
  useEffect(() => {
    const richMotion: boolean = allow3DTransforms && !reducedMotion;
    if (!richMotion) {
      return;
    }
    if (skipSoundRef.current) {
      skipSoundRef.current = false;
      return;
    }
    const frameId: number = requestAnimationFrame(() => {
      playPageTurnSound();
    });
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [pathname, allow3DTransforms, reducedMotion]);
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
      <div
        className="relative z-10 min-h-dvh"
        style={
          richMotion
            ? {
                perspective: "1500px",
                perspectiveOrigin: "50% 50%",
              }
            : undefined
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            className="min-h-dvh [transform-style:preserve-3d] origin-left"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={variants}
            style={{
              backfaceVisibility: "hidden",
              willChange: richMotion ? "transform" : "auto",
            }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
