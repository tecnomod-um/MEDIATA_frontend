import React, { createContext, useContext, useState } from "react";

const NodeContext = createContext();

export const NodeProvider = ({ children }) => {
  const [selectedNodes, setSelectedNodes] = useState([]);

  const selectNode = node => {
    // For single-node access, store as an array with one element.
    setSelectedNodes([node]);
  };

  const selectNodes = nodes => {
    setSelectedNodes(nodes);
  };

  const clearSelectedNodes = () => {
    setSelectedNodes([]);
  };

  return (
    <NodeContext.Provider
      value={{ selectedNodes, selectNode, selectNodes, clearSelectedNodes }}
    >
      {children}
    </NodeContext.Provider>
  );
};

export const useNode = () => useContext(NodeContext);
