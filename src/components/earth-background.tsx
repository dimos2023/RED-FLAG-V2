"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState, type FC } from "react";
import { type Mesh, Vector3, BackSide } from "three";
import earthImg from "@/earth.jpg";

function StaticCameraRig() {
  useFrame((_, delta) => {
    const camera = _;
    camera.position.lerp(new Vector3(0, 14, 30), 0.005);
    camera.lookAt(new Vector3(0, 0.5, 0));
  });
  return null;
}

function EarthMesh() {
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
    globeRef.current.rotation.y += 0.0003;
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

export const EarthBackground: FC = () => {
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
          <StaticCameraRig />
          <EarthMesh />
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
