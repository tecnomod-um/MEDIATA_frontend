import React, { useRef, useCallback, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import RotatingBox from "./rotatingBox";
//import Particle from './particle';

const Scene = () => {
  const { viewport } = useThree();
  const mouse = useRef([0, 0]);
  //const numParticles = 50;

  const handleMouseMove = useCallback(
    (event) => {
      mouse.current = [
        (event.clientX / viewport.width) * 2 - 1,
        (-event.clientY / viewport.height) * 2 + 1,
      ];
    },
    [viewport.width, viewport.height]
  );

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [handleMouseMove]);

  return (
    <>
      <group>
        <RotatingBox
          position={[-3, 0, 0]}
          rotationSpeed={0.01}
          size={[2, 2, 2]}
        />
        <RotatingBox
          position={[-1.5, 0, 0]}
          rotationSpeed={0.015}
          size={[2.3, 2.3, 2.3]}
        />
        <RotatingBox
          position={[0, 0, 0]}
          rotationSpeed={0.02}
          size={[2.5, 2.5, 2.5]}
        />
        <RotatingBox
          position={[1.5, 0, 0]}
          rotationSpeed={0.015}
          size={[2.3, 2.3, 2.3]}
        />
        <RotatingBox
          position={[3, 0, 0]}
          rotationSpeed={0.01}
          size={[2, 2, 2]}
        />
      </group>
    </>
  );
};

export default Scene;
