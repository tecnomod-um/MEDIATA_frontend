import React, { useRef, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { a, useSpring, to } from "@react-spring/three";
import * as THREE from "three";

const JoinNodesDot = ({
  position,
  nodesInGroup,
  globalOpacity,
  onJoinNodesDoubleClick
}) => {
  const ringRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  const { clickScale } = useSpring({
    clickScale: clicked ? 1.3 : 1,
    config: { tension: 600, friction: 30, mass: 0.5 }
  });

  const { hoverOpacity, scale } = useSpring({
    hoverOpacity: hovered ? 1 : 0,
    scale: hovered ? [1, 1, 1] : [0, 1, 1],
    config: { duration: 200 }
  });

  const textOpacity = to([globalOpacity, hoverOpacity], (g, h) => g * h);

  useFrame((state) => {
    if (ringRef.current) {
      const s = 1 + 0.15 * Math.sin(state.clock.elapsedTime * 3);
      ringRef.current.scale.set(s, s, s);
    }
  });

  // Memoize pointer event handlers
  const handlePointerOver = useCallback((e) => {
    e.stopPropagation();
    setHovered(true);
  }, []);

  const handlePointerOut = useCallback((e) => {
    e.stopPropagation();
    setHovered(false);
  }, []);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (!clicked) {
      setClicked(true);
      setTimeout(() => setClicked(false), 150);
    }
  }, [clicked]);

  const handleDoubleClick = useCallback(
    (e) => {
      e.stopPropagation();
      onJoinNodesDoubleClick(nodesInGroup);
    },
    [onJoinNodesDoubleClick, nodesInGroup]
  );

  return (
    <a.group position={[position.x, position.y, 0]} renderOrder={1000}>
      <a.mesh
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <circleGeometry args={[0.35, 32]} />
        <meshBasicMaterial
          color="white"
          transparent
          opacity={0}
          depthTest={false}
        />
      </a.mesh>
      <a.mesh scale={clickScale}>
        <circleGeometry args={[0.15, 32]} />
        <a.meshBasicMaterial
          color="black"
          transparent
          opacity={globalOpacity}
          depthTest={false}
        />
      </a.mesh>
      <a.mesh ref={ringRef}>
        <ringGeometry args={[0.3, 0.35, 32]} />
        <a.meshBasicMaterial
          color="black"
          transparent
          side={THREE.DoubleSide}
          opacity={globalOpacity.to((o) => o * 0.8)}
          depthTest={false}
        />
      </a.mesh>
      <a.group position={[0, 0.6, 0]} scale={scale}>
        <Text
          fontSize={0.4}
          color="black"
          fontWeight="bold"
          anchorX="center"
          anchorY="middle"
          opacity={textOpacity}
          materialProps={{ depthTest: false }}
        >
          Join nodes
        </Text>
      </a.group>
    </a.group>
  );
};

export default React.memo(JoinNodesDot);
