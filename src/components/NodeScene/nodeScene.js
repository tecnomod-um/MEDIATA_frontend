import React from "react";
import { Canvas } from "@react-three/fiber";
import DraggableNodes from "./draggableNodes";

const NodeScene = ({ nodes, onNodeClick }) => {
  return (
    <Canvas
      className="canvas"
      shadows
      camera={{ position: [0, 0, 15], fov: 50 }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <DraggableNodes nodes={nodes} onNodeClick={onNodeClick} />
    </Canvas>
  );
};

export default NodeScene;
