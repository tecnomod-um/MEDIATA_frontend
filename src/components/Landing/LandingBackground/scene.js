// Three.js scene component for landing page animation
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const verticalPlusGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.05);
const horizontalPlusGeometry = new THREE.BoxGeometry(0.5, 0.15, 0.05);

const STAVES = [
  { id: "topStave", baseOffsets: [0.3, 0.15, 0, -0.15, -0.3], color: "#9dcaf0", timeOffset: -0.2 },
  { id: "bottomStave", baseOffsets: [0.3, 0.15, 0, -0.15, -0.3], color: "#b4d6f4", timeOffset: -0.4 },
  { id: "mainStave", baseOffsets: [0.3, 0.15, 0, -0.15, -0.3], color: "#2b5d9f", timeOffset: 0 },
];

const shockClicksRef = { current: [] };

function WavyLine({ baseOffsetY, color, timeOffset }) {
  const { viewport } = useThree();
  const geometryRef = useRef();
  const pointsCount = 64;

  const positions = useMemo(() => new Float32Array(pointsCount * 3), []);
  const points = useMemo(() => Array.from({ length: pointsCount }, () => new THREE.Vector3()), []);

  const getShockDisplacement = useCallback((xPos, yPos, globalTime) => {
    let shockSum = 0;
    shockClicksRef.current.forEach((click) => {
      const dt = globalTime - click.time;
      if (dt < 0 || dt > 4) return;
      const radius = dt * 0.8;
      const dx = xPos - click.xPos;
      const dy = yPos - click.yPos;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius - 0.4 && dist < radius + 0.4) {
        const decay = Math.exp(-0.8 * dt);
        const amp = 0.1 * decay;
        const waveVal = Math.sin(1.5 * (dist - radius)) * amp;
        shockSum += waveVal;
      }
    });
    return shockSum;
  }, []);

  useFrame((state) => {
    const globalTime = state.clock.getElapsedTime();
    const localTime = globalTime + timeOffset;
    const waveFreq = 0.25;
    const waveSpeed = 0.7;
    const amplitude = 0.2;

    for (let i = 0; i < pointsCount; i++) {
      const t = i / (pointsCount - 1);
      const xPos = THREE.MathUtils.lerp(-viewport.width / 2, viewport.width / 2, t);
      const baseY = amplitude * Math.sin(xPos * waveFreq + localTime * waveSpeed);
      let yPos = baseOffsetY + baseY;
      yPos += getShockDisplacement(xPos, yPos, globalTime);

      points[i].set(xPos, yPos, 0);
      positions[i * 3 + 0] = xPos;
      positions[i * 3 + 1] = yPos;
      positions[i * 3 + 2] = 0;
    }

    if (geometryRef.current?.attributes?.position) {
      geometryRef.current.attributes.position.needsUpdate = true;
    }

    shockClicksRef.current = shockClicksRef.current.filter(
      (click) => globalTime - click.time <= 4
    );
  });

  return (
    <line name="wave-line">
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={pointsCount}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} />
    </line>
  );
}

function PlusSign({
  id,
  initialPos,
  spawnTime,
  flightDuration,
  landDuration,
  fadeDuration,
  color,
  waveOffsets,
  onComplete,
}) {
  const groupRef = useRef();
  const [landed, setLanded] = useState(false);
  const lineIndexRef = useRef(2);

  useEffect(() => {
    lineIndexRef.current = Math.floor(Math.random() * waveOffsets.length);
  }, [waveOffsets.length]);

  const applyShockWave = useCallback((position, globalTime, delta) => {
    shockClicksRef.current.forEach((click) => {
      const dt = globalTime - click.time;
      if (dt < 0 || dt > 4) return;
      const radius = dt * 0.8;
      const dx = position.x - click.xPos;
      const dy = position.y - click.yPos;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius + 0.4 && dist > radius - 0.4) {
        const decay = Math.exp(-0.8 * dt);
        const amp = 0.06 * decay;
        const waveVal = Math.sin(1.5 * (dist - radius)) * amp;
        const angle = Math.atan2(dy, dx);
        position.x += Math.cos(angle) * waveVal * (delta * 60);
        position.y += Math.sin(angle) * waveVal * (delta * 60);
      }
    });
  }, []);

  useFrame((state, delta) => {
    const grp = groupRef.current;
    if (!grp) return;

    const globalTime = state.clock.getElapsedTime();
    const age = globalTime - spawnTime;
    const pos = grp.position;

    if (age > flightDuration + landDuration + fadeDuration) {
      onComplete?.(id);
      return;
    }

    if (!landed) {
      const progress = Math.min(age / flightDuration, 1);
      const offsetY = waveOffsets[lineIndexRef.current];
      const waveFreq = 0.25;
      const waveSpeed = 0.7;
      const amplitude = 0.2;
      const waveY = offsetY + amplitude * Math.sin(pos.x * waveFreq + globalTime * waveSpeed);

      pos.y = THREE.MathUtils.lerp(initialPos[1], waveY, progress);
      pos.z = 0;

      applyShockWave(pos, globalTime, delta);
      if (progress >= 1) setLanded(true);
    } else {
      const landedAge = age - flightDuration;
      const fadePhase = landedAge - landDuration;
      if (fadePhase < 0) {
        const waveFreq = 0.25;
        const waveSpeed = 0.7;
        const amplitude = 0.2;
        const offsetY = waveOffsets[lineIndexRef.current];
        const x = pos.x;
        pos.y = offsetY + amplitude * Math.sin(x * waveFreq + globalTime * waveSpeed);
        applyShockWave(pos, globalTime, delta);
      } else {
        const ratio = Math.max(1 - fadePhase / fadeDuration, 0);
        grp.children.forEach((child) => {
          if (child.material) child.material.opacity = ratio;
        });
      }
    }
  });

  return (
    <group ref={groupRef} name="plus-sign" position={[initialPos[0], initialPos[1], 0]}>
      <mesh geometry={verticalPlusGeometry}>
        <meshStandardMaterial color={color} transparent opacity={1} />
      </mesh>
      <mesh geometry={horizontalPlusGeometry}>
        <meshStandardMaterial color={color} transparent opacity={1} />
      </mesh>
    </group>
  );
}

export default function Scene() {
  const [plusSigns, setPlusSigns] = useState([]);
  const { viewport } = useThree();
  const timeRef = useRef(0);

  const handleClick = useCallback(
    (e) => {
      const { width, height } = viewport;
      const xScene = (e.clientX / window.innerWidth - 0.5) * width;
      const yScene = -(e.clientY / window.innerHeight - 0.5) * height;
      shockClicksRef.current.push({ time: timeRef.current, xPos: xScene, yPos: yScene });
    },
    [viewport]
  );

  useEffect(() => {
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [handleClick]);

  useFrame((state) => { timeRef.current = state.clock.getElapsedTime(); });

  useEffect(() => {
    const spawnInterval = setInterval(() => {
      const fromTop = Math.random() > 0.5;
      const spawnY = fromTop ? viewport.height / 2 + 1 : -viewport.height / 2 - 1;
      const spawnX = THREE.MathUtils.randFloatSpread(viewport.width);
      const flightDuration = 3.0;
      const landDuration = 3.0;
      const fadeDuration = 2.0;
      const color = new THREE.Color(`hsl(${200 + Math.random() * 40}, 70%, ${40 + Math.random() * 20}%)`);
      setPlusSigns((prev) => [
        ...prev,
        {
          id: Math.random(),
          initialPos: [spawnX, spawnY],
          spawnTime: timeRef.current,
          flightDuration,
          landDuration,
          fadeDuration,
          color,
        },
      ]);
    }, 1000);
    return () => clearInterval(spawnInterval);
  }, [viewport.width, viewport.height]);

  return (
    <>
      <ambientLight intensity={0.4} name="ambient-light" />
      <directionalLight position={[0, 10, 10]} intensity={0.7} name="directional-light" />
      <mesh position={[0, 0, -5]} name="bg-mesh">
        <planeGeometry args={[viewport.width * 2, viewport.height * 2]} />
        <meshBasicMaterial color="#cce6ff" transparent opacity={0.15} />
      </mesh>

      {STAVES.map((stave) =>
        stave.baseOffsets.map((offsetY, i) => (
          <WavyLine
            key={`${stave.id}-line${i}`}
            baseOffsetY={offsetY}
            color={stave.color}
            timeOffset={stave.timeOffset}
          />
        ))
      )}

      <group name="plus-signs">
        {plusSigns.map((p) => (
          <PlusSign
            key={p.id}
            id={p.id}
            initialPos={p.initialPos}
            spawnTime={p.spawnTime}
            flightDuration={p.flightDuration}
            landDuration={p.landDuration}
            fadeDuration={p.fadeDuration}
            color={p.color}
            waveOffsets={STAVES[2].baseOffsets}
            onComplete={(id) => setPlusSigns((prev) => prev.filter((q) => q.id !== id))}
          />
        ))}
      </group>
    </>
  );
}
