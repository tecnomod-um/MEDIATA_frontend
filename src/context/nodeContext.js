import React, { createContext, useContext, useState } from "react";

const NodeContext = createContext();

export const NodeProvider = ({ children }) => {
  const [selectedNode, setSelectedNode] = useState(null);

  const selectNode = (node) => {
    setSelectedNode(node);
  };

  const clearSelectedNode = () => {
    setSelectedNode(null);
  };

  return (
    <NodeContext.Provider
      value={{ selectedNode, selectNode, clearSelectedNode }}
    >
      {children}
    </NodeContext.Provider>
  );
};

export const useNode = () => useContext(NodeContext);
