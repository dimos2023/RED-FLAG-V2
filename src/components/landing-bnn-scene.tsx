"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

export type FocusPoint = {
  x: number;
  y: number;
};

type LandingBnnSceneProps = {
  focusPoint: FocusPoint;
};

function CameraRig({ focusPoint }: LandingBnnSceneProps) {
  useFrame((state) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const target = new THREE.Vector3(
      focusPoint.x * 1.4,
      0.8 + focusPoint.y * 0.4,
      0,
    );
    const desired = new THREE.Vector3(
      focusPoint.x * 1.25,
      1.45 + focusPoint.y * 0.35,
      7.2,
    );
    camera.position.lerp(desired, 0.04);
    camera.lookAt(target);
  });
  return null;
}

function GridSurface() {
  return (
    <group position={[0, -1.2, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}> 
        <planeGeometry args={[48, 48, 48, 48]} />
        <meshBasicMaterial
          color="#0f766e"
          wireframe
          opacity={0.18}
          transparent
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <planeGeometry args={[48, 48, 10, 10]} />
        <meshBasicMaterial
          color="#14b8a6"
          wireframe
          opacity={0.08}
          transparent
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[1.4, 2.6, 64]} />
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function FocalCloud({ focusPoint }: LandingBnnSceneProps) {
  const points = useMemo(
    () =>
      Array.from({ length: 26 }, () => ({
        position: [
          (Math.random() - 0.5) * 14,
          Math.random() * 2 - 0.5,
          (Math.random() - 0.5) * 14,
        ] as [number, number, number],
        size: 0.025 + Math.random() * 0.045,
        brightness: 0.18 + Math.random() * 0.35,
        color: Math.random() > 0.5 ? "#0ea5e9" : "#14b8a6",
      })),
    [],
  );

  return (
    <group position={[0, -0.9, 0]}>
      {points.map((point, index) => (
        <mesh key={index} position={point.position}>
          <sphereGeometry args={[point.size, 10, 10]} />
          <meshStandardMaterial
            color={point.color}
            emissive={point.color}
            emissiveIntensity={point.brightness}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
      <mesh position={[focusPoint.x * 2.8, 0.08, focusPoint.y * 2.1]}>
        <sphereGeometry args={[0.16, 28, 28]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#22d3ee"
          emissiveIntensity={1}
          transparent
          opacity={0.72}
        />
      </mesh>
    </group>
  );
}

export function LandingBnnScene({ focusPoint }: LandingBnnSceneProps) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <Canvas camera={{ position: [0, 1.35, 7.8], fov: 46 }}>
        <color attach="background" args={["#020613"]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 8, 4]} intensity={0.8} />
        <CameraRig focusPoint={focusPoint} />
        <GridSurface />
        <FocalCloud focusPoint={focusPoint} />
      </Canvas>
    </div>
  );
}
