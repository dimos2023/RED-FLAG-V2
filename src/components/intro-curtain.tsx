"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

const HOLD_TITLE_MS = 2600;
const GATHER_DURATION_S = 1.55;
const VIDEO_FALLBACK_MS = 16000;
const MASTER_INTRO_MAX_MS = 22000;
const REVEAL_DURATION_S = 1.45;
const VIDEO_SRC = "/intro.mp4";

type Phase = "intro" | "open" | "video" | "done";

type IntroCurtainProps = {
  children: ReactNode;
};

const TITLE = "Red-Flag";

function AliveRedFlagTitle({ phase }: { phase: Phase }) {
  const letters: string[] = TITLE.split("");
  return (
    <h1
      className="flex select-none flex-wrap items-center justify-center gap-[0.02em] text-5xl font-black tracking-tight sm:text-7xl md:text-8xl"
      style={{
        perspective: "900px",
        letterSpacing: "-0.04em",
      }}
    >
      {letters.map((char, index) => (
        <motion.span
          key={`${char}-${index}`}
          className="metallic-text inline-block origin-bottom will-change-transform"
          initial={{ opacity: 0, y: 40, rotateX: -58, filter: "blur(10px)" }}
          animate={
            phase === "intro"
              ? {
                  opacity: 1,
                  y: [0, -5, 0, -3, 0],
                  rotateX: 0,
                  filter: "blur(0px)",
                  scale: [1, 1.045, 1, 1.03, 1],
                }
              : {
                  opacity: 0,
                  y: -32,
                  rotateX: 38,
                  scale: 1.14,
                  filter: "blur(8px)",
                }
          }
          transition={
            phase === "intro"
              ? {
                  opacity: { duration: 0.5, delay: index * 0.06 },
                  y: {
                    duration: 3.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.09,
                  },
                  rotateX: {
                    type: "spring",
                    stiffness: 115,
                    damping: 15,
                    delay: index * 0.06,
                  },
                  filter: { duration: 0.55, delay: index * 0.05 },
                  scale: {
                    duration: 3.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.11,
                  },
                }
              : {
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                  delay: index * 0.03,
                }
          }
        >
          {char === " " ? "\u00a0" : char}
        </motion.span>
      ))}
    </h1>
  );
}

export function IntroCurtain({ children }: IntroCurtainProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [requiresTapToPlay, setRequiresTapToPlay] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const skipIntro: boolean = new URLSearchParams(window.location.search).has(
      "skipintro",
    );
    if (skipIntro) {
      setPhase("done");
      return;
    }
    const master: number = window.setTimeout(() => {
      setPhase("done");
    }, MASTER_INTRO_MAX_MS);
    return () => window.clearTimeout(master);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (new URLSearchParams(window.location.search).has("skipintro")) {
      return;
    }
    const t: number = window.setTimeout(() => {
      setPhase("open");
    }, HOLD_TITLE_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== "open") {
      return;
    }
    const t: number = window.setTimeout(() => {
      setPhase("video");
    }, Math.round(GATHER_DURATION_S * 1000));
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "video") {
      return;
    }
    const video = videoRef.current;
    const attemptPlayback = async (): Promise<void> => {
      if (!video) {
        return;
      }
      video.muted = true;
      video.defaultMuted = true;
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "true");
      try {
        await video.play();
        setRequiresTapToPlay(false);
      } catch {
        setRequiresTapToPlay(true);
      }
    };
    if (video) {
      video.currentTime = 0;
      void attemptPlayback();
    }
    const fallbackTimer: number = window.setTimeout(() => {
      setPhase("done");
    }, VIDEO_FALLBACK_MS);
    return () => window.clearTimeout(fallbackTimer);
  }, [phase]);

  async function handleTapToPlay(): Promise<void> {
    const video = videoRef.current;
    if (!video) {
      setPhase("done");
      return;
    }
    try {
      video.muted = true;
      video.defaultMuted = true;
      await video.play();
      setRequiresTapToPlay(false);
    } catch {
      setPhase("done");
    }
  }

  const easeGather: [number, number, number, number] = [0.76, 0, 0.14, 1];
  const easeReveal: [number, number, number, number] = [0.16, 1, 0.3, 1];

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden bg-transparent">
      <motion.div
        className="relative z-10 min-h-dvh"
        initial={{
          opacity: 0.28,
          scale: 1.045,
          filter: "blur(10px) brightness(0.45) saturate(0.75)",
        }}
        animate={
          phase === "done"
            ? {
                opacity: 1,
                scale: 1,
                filter: "blur(0px) brightness(1) saturate(1)",
              }
            : {
                opacity: 0.28,
                scale: 1.045,
                filter: "blur(10px) brightness(0.45) saturate(0.75)",
              }
        }
        transition={{
          duration: REVEAL_DURATION_S,
          ease: easeReveal,
          delay: phase === "done" ? 0.08 : 0,
        }}
      >
        {children}
      </motion.div>
      <motion.div
        className="pointer-events-none absolute inset-0 z-20"
        initial={{ opacity: 0 }}
        animate={
          phase === "done"
            ? { opacity: [0, 0.9, 0.35, 0] }
            : { opacity: 0 }
        }
        transition={{
          duration: REVEAL_DURATION_S * 1.15,
          times: [0, 0.32, 0.62, 1],
          ease: "easeOut",
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(248,113,113,0.28)_0%,rgba(248,113,113,0.12)_28%,rgba(2,6,23,0)_62%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(102deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.14)_42%,rgba(255,255,255,0)_76%)]" />
      </motion.div>
      <AnimatePresence>
        {phase !== "done" && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="absolute inset-0 bg-black" />
            <motion.div
              className="curtain-panel absolute inset-y-0 left-0 w-1/2 origin-left border-r border-black/60 shadow-[inset_-24px_0_60px_rgba(0,0,0,0.55)]"
              initial={{ x: 0, scaleX: 1, rotateY: 0, skewY: 0 }}
              animate={
                phase === "open" || phase === "video"
                  ? {
                      x: "-4%",
                      scaleX: 0.11,
                      rotateY: -18,
                      skewY: 2,
                    }
                  : {
                      x: 0,
                      scaleX: 1,
                      rotateY: 0,
                      skewY: 0,
                    }
              }
              transition={{ duration: GATHER_DURATION_S, ease: easeGather }}
              style={{ transformStyle: "preserve-3d" }}
            />
            <motion.div
              className="curtain-panel absolute inset-y-0 right-0 w-1/2 origin-right border-l border-black/60 shadow-[inset_24px_0_60px_rgba(0,0,0,0.55)]"
              initial={{ x: 0, scaleX: 1, rotateY: 0, skewY: 0 }}
              animate={
                phase === "open" || phase === "video"
                  ? {
                      x: "4%",
                      scaleX: 0.11,
                      rotateY: 18,
                      skewY: -2,
                    }
                  : {
                      x: 0,
                      scaleX: 1,
                      rotateY: 0,
                      skewY: 0,
                    }
              }
              transition={{ duration: GATHER_DURATION_S, ease: easeGather }}
              style={{ transformStyle: "preserve-3d" }}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(30,10,12,0.5)_0%,transparent_55%)]">
              <motion.div
                className="[perspective:900px]"
                animate={
                  phase === "open" || phase === "video"
                    ? { opacity: 0, scale: 1.15, y: -18 }
                    : { opacity: 1, scale: 1, y: 0 }
                }
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <motion.div
                  animate={
                    phase === "intro"
                      ? { rotateX: [10, 14, 10], z: [0, 6, 0] }
                      : { rotateX: 22, z: 20 }
                  }
                  transition={
                    phase === "intro"
                      ? {
                          duration: 3.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }
                      : { duration: 0.5 }
                  }
                  style={{
                    transformStyle: "preserve-3d",
                    transform: "translateZ(32px)",
                  }}
                >
                  <AliveRedFlagTitle phase={phase} />
                </motion.div>
              </motion.div>
            </div>
            <motion.div
              className="absolute inset-0 z-[60] flex items-center justify-center bg-black"
              initial={{ opacity: 0 }}
              animate={phase === "video" ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                src={VIDEO_SRC}
                autoPlay
                muted
                playsInline
                controls={false}
                preload="auto"
                onEnded={() => setPhase("done")}
                onError={() => setPhase("done")}
                onCanPlay={() => {
                  if (phase === "video") {
                    void videoRef.current?.play().catch(() => {
                      setRequiresTapToPlay(true);
                    });
                  }
                }}
              />
              {requiresTapToPlay ? (
                <div className="pointer-events-auto absolute inset-0 z-[65] flex items-center justify-center bg-black/35 px-4">
                  <button
                    type="button"
                    onClick={() => {
                      void handleTapToPlay();
                    }}
                    className="rounded-xl border border-white/40 bg-white/15 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm"
                  >
                    Tap to start intro video
                  </button>
                </div>
              ) : null}
            </motion.div>
            <motion.div
              className="pointer-events-none absolute inset-x-0 top-0 h-[18%] bg-gradient-to-b from-black via-black/80 to-transparent"
              initial={{ opacity: 0.95 }}
              animate={
                phase === "open" || phase === "video"
                  ? { opacity: 0 }
                  : { opacity: 0.95 }
              }
              transition={{ duration: GATHER_DURATION_S * 0.85, ease: "easeOut" }}
            />
            <motion.div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[18%] bg-gradient-to-t from-black via-black/80 to-transparent"
              initial={{ opacity: 0.95 }}
              animate={
                phase === "open" || phase === "video"
                  ? { opacity: 0 }
                  : { opacity: 0.95 }
              }
              transition={{ duration: GATHER_DURATION_S * 0.85, ease: "easeOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
