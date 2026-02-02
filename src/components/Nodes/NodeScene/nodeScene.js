import React, { useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import DraggableNodes from "./draggableNodes";

// Three.js canvas scene for displaying interactive nodes
const NodeScene = ({ nodes, onNodeClick, onJoinNodesDoubleClick }) => {
  const [contextLost, setContextLost] = useState(false);

  const handleContextLost = useCallback((event) => {
    event.preventDefault();
    setContextLost(true);
  }, []);

  const handleContextRestored = useCallback(() => {
    setContextLost(false);
  }, []);

  return contextLost ? (
    <div>WebGL context lost. Attempting to restore...</div>
  ) : (
    <Canvas
      className="canvas"
      shadows
      camera={{ position: [0, 0, 15], fov: 50 }}
      onCreated={({ gl }) => {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        gl.domElement.addEventListener("webglcontextlost", handleContextLost, false);
        gl.domElement.addEventListener("webglcontextrestored", handleContextRestored, false);
      }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <DraggableNodes
        nodes={nodes}
        onNodeClick={onNodeClick}
        onJoinNodesDoubleClick={onJoinNodesDoubleClick}
      />
    </Canvas>
  );
}

export default NodeScene;
