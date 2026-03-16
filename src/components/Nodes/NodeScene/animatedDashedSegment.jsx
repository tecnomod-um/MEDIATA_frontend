import React, { useRef, useMemo, useLayoutEffect, useEffect } from "react";
import { animated } from "@react-spring/three";
import { Line } from "@react-three/drei";
import * as THREE from "three";

const AnimatedLine = animated(Line);

// Graphic animated dashed line segment used in node connections
const AnimatedDashedSegment = ({ start, end, opacity, registerLine }) => {
  const lineRef = useRef();

  const points = useMemo(() => [new THREE.Vector3(), new THREE.Vector3()], []);

  useLayoutEffect(() => {
    const line = lineRef.current;
    if (!line) return;

    const sx = start.x, sy = start.y;
    const ex = end.x, ey = end.y;

    points[0].set(sx, sy, 0);
    points[1].set(ex, ey, 0);

    if (line.geometry && typeof line.geometry.setPositions === "function") 
      line.geometry.setPositions([sx, sy, 0, ex, ey, 0]);
     else if (line.geometry && typeof line.geometry.setFromPoints === "function") 
      line.geometry.setFromPoints(points);

    if (typeof line.computeLineDistances === "function") 
      line.computeLineDistances();
  }, [start.x, start.y, end.x, end.y, points]);

  useEffect(() => {
    const line = lineRef.current;
    if (!line || !registerLine) return;
    registerLine(line);
    return () => registerLine(line, true);
  }, [registerLine]);

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
    />
  );
};

export default React.memo(AnimatedDashedSegment);
