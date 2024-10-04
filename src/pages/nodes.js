import React, { useState, useEffect } from "react";
import { getNodeList, getNodeInfo, nodeAuth } from "../util/petitionHandler";
import NodeScene from "../components/NodeScene/nodeScene";
import NodesStyles from "./nodes.module.css";
import { useNode } from "../context/nodeContext";
import config from "../config";
import { useNavigate } from "react-router-dom";

const Nodes = () => {
  const [nodes, setNodes] = useState([]);
  const [error, setError] = useState(null);
  const [showError, setShowError] = useState(false);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const { selectNode } = useNode();
  const navigate = useNavigate();

  console.log(nodes);
  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const data = await getNodeList();
        const newNodes = data.map((node) => {
          const existingNode = nodes.find((n) => n.nodeId === node.nodeId);
          return {
            ...node,
            position: existingNode
              ? existingNode.position
              : {
                  x: (Math.random() - 0.5) * 10,
                  y: (Math.random() - 0.5) * 10,
                  z: 0,
                },
          };
        });
        const nodesChanged =
          newNodes.length !== nodes.length ||
          newNodes.some((newNode, index) => {
            const oldNode = nodes[index];
            return (
              !oldNode ||
              Object.keys(newNode).some((key) => newNode[key] !== oldNode[key])
            );
          });

        if (nodesChanged) {
          setNodes(newNodes);
        }
        setShowError(false);
        setTimeout(() => {
          setError(null);
        }, 500);

        if (!initialFetchDone) {
          setInitialFetchDone(true);
        }
      } catch (err) {
        console.error("Failed to fetch nodes:", err);
        setError("Failed to fetch nodes");
        setShowError(true);
        if (!initialFetchDone) {
          setInitialFetchDone(true);
        }
      }
    };

    fetchNodes();
    const intervalId = setInterval(fetchNodes, config.pollingInterval);
    return () => clearInterval(intervalId);
  }, [nodes, initialFetchDone]);

  const handleNodeClick = async (nodeId) => {
    try {
      const response = await getNodeInfo(nodeId);
      if (response.error) {
        throw new Error(response.error);
      }

      const { token, nodeInfo } = response;

      // Authenticate the node and get a new JWT token
      const validationResponse = await nodeAuth(nodeInfo.serviceUrl, token);
      if (validationResponse.error) {
        throw new Error(validationResponse.error);
      }

      const { jwtNodeToken } = validationResponse;
      console.log("Got node JWT:", jwtNodeToken);

      selectNode(nodeInfo);
      setTimeout(() => {
        navigate("/csvchecker");
      }, 200);
    } catch (err) {
      console.error("Failed to fetch node info:", err);
      setError(err.message);
      setShowError(true);
    }
  };

  return (
    <div className={NodesStyles.container}>
      {error && (
        <div
          className={`${NodesStyles.error} ${
            showError ? NodesStyles.fadeIn : NodesStyles.fadeOut
          }`}
        >
          {error}
        </div>
      )}
      {initialFetchDone && nodes.length === 0 && (
        <div className={`${NodesStyles.noNodes} ${NodesStyles.fadeIn}`}>
          No nodes connected to the system
        </div>
      )}
      <NodeScene nodes={nodes} onNodeClick={handleNodeClick} />
    </div>
  );
};

export default Nodes;
