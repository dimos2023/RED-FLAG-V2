"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState, type FC } from "react";
import { type Mesh, Vector3, BackSide } from "three";
import earthImg from "@/earth.jpg";

export type FocusPoint = {
  x: number;
  y: number;
};

type GlobeBackgroundProps = {
  focusPoint: FocusPoint;
};

function CameraRig({ focusPoint }: GlobeBackgroundProps) {
  const frame = useRef(0);
  useFrame((_, delta) => {
    const camera = _.camera;
    frame.current += delta;
    const slowMotion = Math.min(frame.current / 8, 1);
    const basePosition = new Vector3(0, 14, 30);
    const targetPosition = new Vector3(
      focusPoint.x * 6,
      6 + focusPoint.y * 3.5,
      12,
    );
    const desired = basePosition.lerp(targetPosition, slowMotion * 0.18);
    camera.position.lerp(desired, 0.028);
    camera.lookAt(new Vector3(focusPoint.x * 2.2, 0.5, focusPoint.y * 2.5));
  });
  return null;
}

function GlobeMesh({ focusPoint }: GlobeBackgroundProps) {
  const texture = useTexture(earthImg.src as string);
  const globeRef = useRef<Mesh | null>(null);

  useEffect(() => {
    if (texture) {
      texture.needsUpdate = true;
    }
  }, [texture]);

  useFrame(() => {
    if (!globeRef.current) {
      return;
    }
    const speed = 0.0005 + Math.abs(focusPoint.x) * 0.0008;
    globeRef.current.rotation.y += speed;
    globeRef.current.rotation.x = focusPoint.y * 0.03;
  });

  return (
    <>
      <mesh ref={globeRef} position={[0, 0.2, 0]}> 
        <sphereGeometry args={[6.2, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          metalness={0.1}
          roughness={0.8}
          emissive="#101a2d"
          emissiveIntensity={0.18}
          envMapIntensity={0.65}
        />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[6.35, 64, 64]} />
        <meshPhongMaterial
          color="#0a2f4b"
          transparent
          opacity={0.08}
          shininess={8}
          specular="#81d8ff"
          side={BackSide}
        />
      </mesh>
    </>
  );
}

export const GlobeBackground: FC<GlobeBackgroundProps> = ({ focusPoint }) => {
  const [loaded, setLoaded] = useState(false);
  const overlay = useMemo(
    () => (
      <div className="pointer-events-none fixed inset-0 -z-10 bg-black/44" />
    ),
    [],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoaded(true), 220);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <Suspense
      fallback={
        <div className="pointer-events-none fixed inset-0 -z-10 bg-slate-950" />
      }
    >
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {overlay}
        <Canvas camera={{ position: [0, 18, 32], fov: 35 }}>
          <color attach="background" args={["#02040b"]} />
          <ambientLight intensity={0.9} />
          <hemisphereLight args={["#8cc8ff", "#021221", 0.25]} />
          <directionalLight
            position={[6, 12, 8]}
            intensity={1.8}
            castShadow={false}
            color="#f5f8ff"
          />
          <directionalLight
            position={[-8, 6, -5]}
            intensity={0.95}
            color="#94d2ff"
          />
          <Stars radius={80} depth={40} count={4500} factor={4} saturation={0.35} fade />
          <CameraRig focusPoint={focusPoint} />
          <GlobeMesh focusPoint={focusPoint} />
          {loaded ? (
            <mesh position={[0, 0.5, 0]}> 
              <sphereGeometry args={[6.25, 64, 64]} />
              <meshStandardMaterial
                color="#000000"
                transparent
                opacity={0.08}
                roughness={0.8}
              />
            </mesh>
          ) : null}
        </Canvas>
      </div>
    </Suspense>
  );
};
