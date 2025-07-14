import React, { useEffect, useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import Scene from "./scene";

const LandingBackground = () => {
  const [contextLost, setContextLost] = useState(false);
  const [webGLSupported, setWebGLSupported] = useState(true);
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

    if (!gl) {
      setWebGLSupported(false);
      console.log("WebGL is not supported by your browser or device.");
      return;
    }

    const handleContextLost = (event) => {
      event.preventDefault();
      setContextLost(true);
      console.log("WebGL context lost. Attempting to restore...");
    };

    const handleContextRestored = () => {
      setContextLost(false);
      console.log("WebGL context restored. Reinitializing renderer...");
    };

    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    };
  }, []);

  if (!webGLSupported) {
    return (
      <div>
        Your browser or device does not support WebGL. Please try with a
        different browser or device.
      </div>
    );
  }

  return contextLost ? (
    <div>WebGL context lost. Attempting to restore...</div>
  ) : (
    <Canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        height: "100vh",
        width: "100vw",
        zIndex: -1,
      }}
      dpr={Math.min(window.devicePixelRatio, 1.5)}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <Scene />
    </Canvas>
  );
};

export default LandingBackground;
