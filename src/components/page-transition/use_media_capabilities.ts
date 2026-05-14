"use client";

import { useEffect, useState } from "react";

const MIN_WIDTH_HEAVY_3D: number = 900;

export type MediaCapabilities = {
  reducedMotion: boolean;
  allowHeavy3D: boolean;
};

export function useMediaCapabilities(): MediaCapabilities {
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [wideEnough, setWideEnough] = useState<boolean>(false);
  useEffect(() => {
    const mqReduce: MediaQueryList = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const onReduceChange = (): void => {
      setReducedMotion(mqReduce.matches);
    };
    const onResize = (): void => {
      setWideEnough(window.innerWidth >= MIN_WIDTH_HEAVY_3D);
    };
    onReduceChange();
    onResize();
    mqReduce.addEventListener("change", onReduceChange);
    window.addEventListener("resize", onResize);
    return () => {
      mqReduce.removeEventListener("change", onReduceChange);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  const allowHeavy3D: boolean = !reducedMotion && wideEnough;
  return { reducedMotion, allowHeavy3D };
}
