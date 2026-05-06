"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Clone, Environment, Float, Text, useGLTF } from "@react-three/drei";
import type { Group, Object3D } from "three";
import { AdditiveBlending } from "three";

type Phase = "intro" | "open" | "done";

type RealisticHandshakeSceneProps = {
  phase: Phase;
};

type HandshakeActorProps = {
  side: "left" | "right";
  timelineRef: React.MutableRefObject<number>;
};

const HUMAN_MODEL_URL =
  "/models/cesium-man.glb";

function HandshakeActor({ side, timelineRef }: HandshakeActorProps) {
  const groupRef = useRef<Group>(null);
  const shoulderBoneRef = useRef<Object3D | null>(null);
  const armBoneRef = useRef<Object3D | null>(null);
  const handBoneRef = useRef<Object3D | null>(null);
  const upperLegBoneRef = useRef<Object3D | null>(null);
  const lowerLegBoneRef = useRef<Object3D | null>(null);
  const direction = side === "left" ? 1 : -1;
  const { scene } = useGLTF(HUMAN_MODEL_URL);

  useEffect(() => {
    if (!groupRef.current) {
      return;
    }
    groupRef.current.traverse((node: Object3D) => {
      const name = node.name.toLowerCase();
      if (!shoulderBoneRef.current && /shoulder/.test(name)) {
        const isCorrectSide =
          side === "left" ? /right/.test(name) : /left/.test(name);
        if (isCorrectSide) {
          shoulderBoneRef.current = node;
        }
      }
      if (!armBoneRef.current && /arm/.test(name) && !/forearm/.test(name)) {
        const isCorrectSide =
          side === "left" ? /right/.test(name) : /left/.test(name);
        if (isCorrectSide) {
          armBoneRef.current = node;
        }
      }
      if (!handBoneRef.current && /hand/.test(name)) {
        const isCorrectSide =
          side === "left" ? /right/.test(name) : /left/.test(name);
        if (isCorrectSide) {
          handBoneRef.current = node;
        }
      }
      if (
        !upperLegBoneRef.current &&
        /(upleg|thigh)/.test(name) &&
        !/twist/.test(name)
      ) {
        const isCorrectSide =
          side === "left" ? /left/.test(name) : /right/.test(name);
        if (isCorrectSide) {
          upperLegBoneRef.current = node;
        }
      }
      if (
        !lowerLegBoneRef.current &&
        /(leg|calf|shin)/.test(name) &&
        !/(upleg|thigh|twist)/.test(name)
      ) {
        const isCorrectSide =
          side === "left" ? /left/.test(name) : /right/.test(name);
        if (isCorrectSide) {
          lowerLegBoneRef.current = node;
        }
      }
    });
  }, [side]);

  useFrame((state) => {
    if (!groupRef.current) {
      return;
    }
    const t = timelineRef.current;
    const walkProgress = Math.min(t / 0.72, 1);
    const handshakeProgress = Math.max(0, Math.min((t - 0.72) / 0.28, 1));
    const stride = Math.sin(state.clock.elapsedTime * 10.2) * 0.24 * (1 - handshakeProgress);
    const bodyBob = Math.abs(Math.sin(state.clock.elapsedTime * 10.2)) * 0.06 * (1 - handshakeProgress);
    const idleWave = Math.sin(state.clock.elapsedTime * 4.1) * 0.02;
    const xStart = side === "left" ? -6.4 : 6.4;
    const xEnd = side === "left" ? -1.45 : 1.45;
    groupRef.current.position.x = xStart + (xEnd - xStart) * walkProgress;
    groupRef.current.position.y = -2.05 + bodyBob;
    groupRef.current.position.z = 0.9 - walkProgress * 0.38;
    groupRef.current.rotation.y =
      side === "left"
        ? 0.65 - walkProgress * 0.74
        : -0.65 + walkProgress * 0.74;
    groupRef.current.scale.setScalar(2.45);
    if (shoulderBoneRef.current) {
      shoulderBoneRef.current.rotation.z =
        direction * (-0.24 + handshakeProgress * 0.78 + idleWave) + stride * 0.35;
      shoulderBoneRef.current.rotation.x = -0.08 + handshakeProgress * 0.2;
    }
    if (armBoneRef.current) {
      armBoneRef.current.rotation.z =
        direction * (-0.35 + handshakeProgress * 1.05 + idleWave) + stride * 0.4;
      armBoneRef.current.rotation.x = handshakeProgress * 0.26;
    }
    if (handBoneRef.current) {
      handBoneRef.current.rotation.y = direction * (0.12 + handshakeProgress * 0.66);
    }
    if (upperLegBoneRef.current) {
      upperLegBoneRef.current.rotation.x = -stride * 0.9;
    }
    if (lowerLegBoneRef.current) {
      lowerLegBoneRef.current.rotation.x = Math.max(0, stride * 0.7);
    }
  });

  return (
    <group ref={groupRef}>
      <Clone object={scene} />
    </group>
  );
}

function HandshakePortal({
  timelineRef,
}: {
  timelineRef: React.MutableRefObject<number>;
}) {
  const portalRef = useRef<Group>(null);
  useFrame((state) => {
    if (!portalRef.current) {
      return;
    }
    const t = timelineRef.current;
    const progress = Math.max(0, Math.min((t - 0.74) / 0.26, 1));
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 5.2) * 0.04;
    portalRef.current.position.set(0, -0.08 + progress * 0.28, 0.18);
    portalRef.current.scale.setScalar(Math.max(0.01, progress) * pulse);
  });
  return (
    <group ref={portalRef}>
      <mesh position={[0, 0, 0]} rotation={[-0.06, 0, 0]}>
        <planeGeometry args={[3.5, 2.1]} />
        <meshStandardMaterial
          color="#020617"
          emissive="#7f1d1d"
          emissiveIntensity={1.2}
          roughness={0.24}
          metalness={0.55}
        />
      </mesh>
      <mesh position={[0, 0, 0.04]} rotation={[-0.06, 0, 0]}>
        <planeGeometry args={[3.25, 1.85]} />
        <meshStandardMaterial
          color="#0f172a"
          emissive="#dc2626"
          emissiveIntensity={0.3}
          roughness={0.28}
          metalness={0.4}
        />
      </mesh>
      <Text
        position={[0, 0.23, 0.08]}
        fontSize={0.27}
        color="#f8fafc"
        anchorX="center"
        anchorY="middle"
      >
        Red-Flag
      </Text>
      <Text
        position={[0, -0.18, 0.08]}
        fontSize={0.1}
        color="#f87171"
        anchorX="center"
        anchorY="middle"
      >
        Verified Fraud Intelligence
      </Text>
    </group>
  );
}

function HandshakeBurst({
  timelineRef,
}: {
  timelineRef: React.MutableRefObject<number>;
}) {
  const burstRef = useRef<Group>(null);
  useFrame((state) => {
    if (!burstRef.current) {
      return;
    }
    const t = timelineRef.current;
    const active = Math.max(0, Math.min((t - 0.82) / 0.16, 1));
    const pulse = 0.2 + Math.sin(state.clock.elapsedTime * 8) * 0.04;
    burstRef.current.position.set(0, 0.84, 0.16);
    burstRef.current.scale.setScalar(active + pulse);
    burstRef.current.visible = active > 0.02;
  });
  return (
    <group ref={burstRef}>
      <mesh>
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#fecaca"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.32, 24, 24]} />
        <meshBasicMaterial
          color="#dc2626"
          opacity={0.25}
          transparent
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function HandshakeStage({ phase }: { phase: Phase }) {
  const timelineRef = useRef<number>(0);
  useFrame((_, delta) => {
    const speed = phase === "open" ? 0.72 : -1.8;
    timelineRef.current = Math.max(
      0,
      Math.min(1, timelineRef.current + delta * speed),
    );
  });
  return (
    <>
      <ambientLight intensity={0.62} />
      <directionalLight position={[4, 7, 5]} intensity={1.95} color="#fef2f2" />
      <spotLight
        position={[0, 7, 4]}
        angle={0.52}
        penumbra={0.8}
        intensity={4}
        distance={24}
        color="#fca5a5"
      />
      <Environment preset="city" />
      <HandshakeActor side="left" timelineRef={timelineRef} />
      <HandshakeActor side="right" timelineRef={timelineRef} />
      <Float speed={1.5} rotationIntensity={0.12} floatIntensity={0.08}>
        <HandshakePortal timelineRef={timelineRef} />
      </Float>
      <HandshakeBurst timelineRef={timelineRef} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.45, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial
          color="#020617"
          emissive="#020617"
          roughness={0.92}
          metalness={0.05}
        />
      </mesh>
    </>
  );
}

export function RealisticHandshakeScene({ phase }: RealisticHandshakeSceneProps) {
  if (phase === "intro") {
    return null;
  }
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[14%] z-[60]">
      <Canvas
        camera={{ position: [0, 1.35, 6.3], fov: 30 }}
        dpr={[1, 1.6]}
        gl={{ alpha: true, antialias: true }}
      >
        <Suspense fallback={null}>
          <HandshakeStage phase={phase} />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(HUMAN_MODEL_URL);
