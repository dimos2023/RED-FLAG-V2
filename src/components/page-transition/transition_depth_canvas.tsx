"use client";

import { Grid } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { ReactNode } from "react";
import type { Group } from "three";

function DepthScene({ routeTick }: { routeTick: number }): ReactNode {
  const groupRef = useRef<Group>(null);
  useFrame((_, delta) => {
    const g: Group | null = groupRef.current;
    if (!g) {
      return;
    }
    g.rotation.y += delta * 0.05;
    g.rotation.x = 0.1 + Math.sin(routeTick * 0.35) * 0.03;
  });
  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.4} />
      <pointLight color="#f87171" intensity={1.1} position={[2.5, 2.5, 4]} />
      <pointLight color="#22d3ee" intensity={0.5} position={[-3, -0.5, 2]} />
      <mesh position={[0, 0.2, -4]} rotation={[0.12, 0.18, 0]}>
        <planeGeometry args={[20, 11, 1, 1]} />
        <meshStandardMaterial
          color="#020617"
          emissive="#450a0a"
          emissiveIntensity={0.4}
          metalness={0.35}
          roughness={0.9}
          transparent
          opacity={0.5}
        />
      </mesh>
      <Grid
        position={[0, -0.85, -2.8]}
        args={[14, 14]}
        fadeDistance={9}
        fadeStrength={1.25}
        cellSize={0.55}
        sectionSize={2.8}
        sectionColor="#dc2626"
        sectionThickness={1}
        cellColor="#334155"
        cellThickness={0.45}
        infiniteGrid
      />
    </group>
  );
}

export type TransitionDepthCanvasProps = {
  routeTick: number;
};

export function TransitionDepthCanvas({
  routeTick,
}: TransitionDepthCanvasProps): ReactNode {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 opacity-35 md:opacity-50"
      aria-hidden
    >
      <Canvas
        dpr={[1, 1.2]}
        gl={{
          alpha: true,
          antialias: false,
          powerPreference: "low-power",
        }}
        frameloop="always"
        camera={{ position: [0, 0.4, 5.8], fov: 40, near: 0.1, far: 22 }}
      >
        <color attach="background" args={["#020617"]} />
        <DepthScene routeTick={routeTick} />
      </Canvas>
    </div>
  );
}
