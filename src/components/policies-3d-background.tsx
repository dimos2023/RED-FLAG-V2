"use client";

import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Points, PointMaterial, Preload } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import type { Group, Points as ThreePoints } from "three";

const PARTICLE_COUNT = 320;

function ParticleField() {
  const groupRef = useRef<Group | null>(null);
  const pointsRef = useRef<ThreePoints | null>(null);
  const [pointer, setPointer] = useState<[number, number]>([0, 0]);

  const positions = useMemo(() => {
    const array = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const index = i * 3;
      array[index] = (Math.random() * 2 - 1) * 16;
      array[index + 1] = (Math.random() * 2 - 1) * 6;
      array[index + 2] = (Math.random() * 2 - 1) * 16;
    }
    return array;
  }, []);

  useFrame((state) => {
    if (!groupRef.current || !pointsRef.current) {
      return;
    }
    const elapsed = state.clock.elapsedTime;
    groupRef.current.rotation.y = elapsed * 0.03 + pointer[0] * 0.4;
    groupRef.current.rotation.x = pointer[1] * 0.2;
    pointsRef.current.rotation.x = elapsed * 0.02;
  });

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    const x = event.clientX / window.innerWidth - 0.5;
    const y = event.clientY / window.innerHeight - 0.5;
    setPointer([x, y]);
  };

  return (
    <group ref={groupRef} onPointerMove={handlePointerMove}>
      <ambientLight intensity={0.28} />
      <pointLight position={[3, 3, 5]} intensity={1.2} color="#f97316" />
      <pointLight position={[-3, -2, 4]} intensity={0.75} color="#34d399" />
      <group position={[0, 0, 0]}>
        <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
          <PointMaterial
            transparent
            vertexColors={false}
            size={0.08}
            sizeAttenuation
            depthWrite={false}
            color="#94f0b7"
          />
        </Points>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.2, 0]}>
        <planeGeometry args={[42, 42, 32, 32]} />
        <meshBasicMaterial color="#0f172a" wireframe opacity={0.05} transparent />
      </mesh>
    </group>
  );
}

export default function Policies3DBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <Canvas camera={{ position: [0, 1.5, 12], fov: 40 }}>
        <fog attach="fog" args={["#020617", 6, 18]} />
        <ParticleField />
        <Preload all />
      </Canvas>
    </div>
  );
}
