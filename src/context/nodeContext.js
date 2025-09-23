import React, { createContext, useContext, useState, useEffect } from "react";

const NodeContext = createContext();

export const NodeProvider = ({ children }) => {
  const [selectedNodes, setSelectedNodes] = useState(() => {
    try {
      const raw = localStorage.getItem("selectedNodes");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "selectedNodes") {
        try {
          setSelectedNodes(e.newValue ? JSON.parse(e.newValue) : []);
        } catch {
          setSelectedNodes([]);
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = (nodes) => {
    setSelectedNodes(nodes);
    try {
      if (nodes?.length) {
        localStorage.setItem("selectedNodes", JSON.stringify(nodes));
      } else {
        localStorage.removeItem("selectedNodes");
      }
    } catch {
      // ignore quota / serialization issues
    }
  };

  const selectNode = (node) => persist([node]);            // single-node mode
  const selectNodes = (nodes) => persist(nodes);           // multi-node mode
  const clearSelectedNodes = () => persist([]);

  return (
    <NodeContext.Provider
      value={{ selectedNodes, selectNode, selectNodes, clearSelectedNodes }}
    >
      {children}
    </NodeContext.Provider>
  );
};

export const useNode = () => useContext(NodeContext);
