import React, { useState, useEffect } from "react";
import { getNodeList, getNodeInfo, getNodeMetadata, nodeAuth } from "../util/petitionHandler";
import NodeScene from "../components/Nodes/NodeScene/nodeScene";
import NodesStyles from "./nodes.module.css";
import { useNode } from "../context/nodeContext";
import config from "../config";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate } from "react-router-dom";
import MetadataDisplay from "../components/Nodes/MetadataDisplay/metadataDisplay";
import JoinedNodesDisplay from "../components/Nodes/JoinedNodesDisplay/joinedNodesDisplay";
import SchemaTray from "../components/Common/SchemaTray/schemaTray";
import { lightenColor } from "../util/colors";

const Nodes = () => {
  const [nodes, setNodes] = useState([]);
  const [error, setError] = useState(null);
  const [showError, setShowError] = useState(false);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [schema, setSchema] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [accessingNode, setAccessingNode] = useState(false);
  const [joinedNodes, setJoinedNodes] = useState([]);
  const [showJoinedNodesModal, setShowJoinedNodesModal] = useState(false);
  const { selectNode, selectNodes } = useNode();

  const navigate = useNavigate();

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
          newNodes.some((newNode, idx) => {
            const oldNode = nodes[idx];
            if (!oldNode) return true;
            return Object.keys(newNode).some(
              (key) => newNode[key] !== oldNode[key]
            );
          });

        if (nodesChanged) setNodes(newNodes);
        setShowError(false);
        setTimeout(() => {
          setError(null);
        }, 500);
        if (!initialFetchDone) setInitialFetchDone(true);
      } catch (err) {
        console.error("Failed to fetch nodes:", err);
        setError("Failed to fetch nodes");
        setShowError(true);
        if (!initialFetchDone) setInitialFetchDone(true);
      }
    };

    fetchNodes();
    const intervalId = setInterval(fetchNodes, config.pollingInterval);
    return () => clearInterval(intervalId);
  }, [nodes, initialFetchDone]);

  useEffect(() => {
    if (initialFetchDone) {
      toast.info(
        "Double click nodes to enter them or drag them around. To work inside multiple at once, drag them together.",
        {
          position: "top-left",
          autoClose: 6000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: false,
        }
      );
    }
  }, [initialFetchDone]);

  const handleNodeClick = async (nodeId) => {
    const node = nodes.find((n) => n.nodeId === nodeId);
    if (!node) {
      console.error(`Node with ID ${nodeId} not found.`);
      return;
    }
    const lighterHeaderColor = lightenColor(node.color, 20);
    setSelectedNode({ ...node, lighterHeaderColor });
    setMetadata(null);
    setLoadingMetadata(true);
    setShowMetadataModal(true);

    try {
      const fetchedData = await getNodeMetadata(nodeId);
      setMetadata(fetchedData.metadata);
    } catch (err) {
      console.error("Failed to fetch node metadata:", err);
      setError("Failed to fetch node metadata");
      setShowError(true);
    } finally {
      setLoadingMetadata(false);
    }
  };

  const handleAccessNode = async () => {
    setAccessingNode(true);
    try {
      const response = await getNodeInfo(selectedNode.nodeId);
      if (response.error) throw new Error(response.error);

      const { token, nodeInfo } = response;
      // Call nodeAuth with the node's service URL and token.
      const validationResponse = await nodeAuth(nodeInfo.serviceUrl, token);
      if (validationResponse.error) throw new Error(validationResponse.error);

      const { jwtNodeToken } = validationResponse;
      console.log("Got node JWT for node", selectedNode.nodeId, ":", jwtNodeToken);
      // The token is now stored (see nodeAuth below) in the mapping.
      selectNode(nodeInfo);
      setShowMetadataModal(false);
      setTimeout(() => {
        navigate("/discovery");
      }, 200);
    } catch (err) {
      console.error("Failed to fetch node info:", err);
      setError(err.message);
      setShowError(true);
    } finally {
      setAccessingNode(false);
    }
  };


  const handleJoinNodesDoubleClick = (joinedNodeIds) => {
    const groupNodes = nodes.filter((n) => joinedNodeIds.includes(n.nodeId));
    setJoinedNodes(groupNodes);
    setShowJoinedNodesModal(true);
  };

  const handleAccessJoinedNodes = async () => {
    setAccessingNode(true);
    try {
      const accessPromises = joinedNodes.map(async (node) => {
        const response = await getNodeInfo(node.nodeId);
        if (response.error) throw new Error(response.error);
        const { token, nodeInfo } = response;
        const validationResponse = await nodeAuth(nodeInfo.serviceUrl, token);
        if (validationResponse.error) throw new Error(validationResponse.error);
        return { ...nodeInfo, jwtNodeToken: validationResponse.jwtNodeToken };
      });
      const accessedNodes = await Promise.all(accessPromises);
      console.log("Accessed nodes", accessedNodes);
      selectNodes(accessedNodes);
      setShowJoinedNodesModal(false);
      navigate("/discovery");
    } catch (err) {
      console.error("Failed to access joined nodes:", err);
      setError(err.message);
      setShowError(true);
    } finally {
      setAccessingNode(false);
    }
  };


  return (
    <div className={NodesStyles.container}>
      {error && (
        <div
          className={`${NodesStyles.error} ${showError ? NodesStyles.fadeIn : NodesStyles.fadeOut
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
      <NodeScene
        nodes={nodes}
        onNodeClick={handleNodeClick}
        onJoinNodesDoubleClick={handleJoinNodesDoubleClick}
      />
      <MetadataDisplay
        isOpen={showMetadataModal}
        metadata={metadata}
        loadingMetadata={loadingMetadata}
        accessingNode={accessingNode}
        headerColor={selectedNode?.lighterHeaderColor || "#D2743C"}
        nodeName={selectedNode?.name || "Node"}
        nodeDescription={selectedNode?.description || ""}
        closeModal={() => setShowMetadataModal(false)}
        onAccessNode={handleAccessNode}
      />
      <JoinedNodesDisplay
        isOpen={showJoinedNodesModal}
        joinedNodes={joinedNodes}
        onClose={() => setShowJoinedNodesModal(false)}
        onAccessJoinedNodes={handleAccessJoinedNodes}
        accessingNode={accessingNode}
      />
      <SchemaTray
        error={error}
        setError={setError}
        setShowError={setShowError}
        nodesFetched={initialFetchDone}
        externalSchema={schema}
        onSchemaChange={(newSchema) => setSchema(newSchema)}
      />
      <ToastContainer
        autoClose={2000}
        hideProgressBar={true}
        className={NodesStyles.toastContainer}
        toastClassName={NodesStyles.toast}
      />
    </div>
  );
};

export default Nodes;
