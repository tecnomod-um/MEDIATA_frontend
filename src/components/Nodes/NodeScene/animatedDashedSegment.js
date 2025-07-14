import { useFrame } from "@react-three/fiber";
import React, { useRef, useMemo } from "react";
import { animated } from "@react-spring/three";
import { Line } from "@react-three/drei";
import * as THREE from "three";

const AnimatedLine = animated(Line);

const AnimatedDashedSegment = ({ start, end, opacity }) => {
  // Cache the line points so they recalc only when positions change
  const points = useMemo(
    () => [
      new THREE.Vector3(start.x, start.y, 0),
      new THREE.Vector3(end.x, end.y, 0)
    ],
    [start.x, start.y, end.x, end.y]
  );
  const lineRef = useRef();

  useFrame((state, delta) => {
    if (lineRef.current?.material) {
      const mat = lineRef.current.material;
      if (typeof mat.dashOffset === "number") {
        mat.dashOffset -= delta * 0.5;
      }
    }
  });

  return (
    <AnimatedLine
      ref={lineRef}
      points={points}
      color="black"
      dashed
      dashSize={0.3}
      gapSize={0.2}
      lineWidth={5}
      opacity={opacity}
      transparent
      onUpdate={(self) => {
        if (typeof self.computeLineDistances === "function") {
          self.computeLineDistances();
        }
      }}
    />
  );
};

export default React.memo(AnimatedDashedSegment);
