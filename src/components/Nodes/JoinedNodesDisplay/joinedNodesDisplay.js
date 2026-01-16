import React, { useState, useRef, useEffect } from "react";
import OverlayWrapper from "../../Common/OverlayWrapper/overlayWrapper";
import { IoMdClose } from "react-icons/io";
import JoinedNodesDisplayStyles from "./joinedNodesDisplay.module.css";
import DatasetCard from "../MetadataDisplay/datasetCard";
import { getNodeMetadata } from "../../../util/petitionHandler";

// Card representing a node in the joined nodes display
const JoinedNodeCard = ({ node }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);

  const toggleExpansion = async () => {
    // Only fetch metadata once, when user first expands
    if (!isExpanded && !metadata) {
      setLoadingMetadata(true);
      try {
        const fetchedData = await getNodeMetadata(node.nodeId);
        setMetadata(fetchedData.metadata);
      } catch (err) {
        console.error("Failed to load metadata for node", node.nodeId, err);
      } finally {
        setLoadingMetadata(false);
      }
    }
    setIsExpanded((prev) => !prev);
  };

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(isExpanded ? contentRef.current.scrollHeight : 0);
    }
  }, [isExpanded, metadata]);

  return (
    <div className={JoinedNodesDisplayStyles.nodeCard}>
      <div className={JoinedNodesDisplayStyles.nodeHeader}>
        <div className={JoinedNodesDisplayStyles.nodeInfo}>
          <h4 className={JoinedNodesDisplayStyles.nodeName}>{node.name}</h4>
          <p className={JoinedNodesDisplayStyles.nodeDesc}>
            {node.description || "No description provided."}
          </p>
        </div>
        <button
          className={JoinedNodesDisplayStyles.toggleButton}
          onClick={!loadingMetadata ? toggleExpansion : undefined}
        >
          {loadingMetadata ? (
            <div className={JoinedNodesDisplayStyles.smallSpinner} />
          ) : (
            isExpanded ? "Hide datasets" : "Show datasets"
          )}
        </button>
      </div>
      <div
        className={JoinedNodesDisplayStyles.collapsibleWrapper}
        style={{ maxHeight: `${contentHeight}px` }}
      >
        <div ref={contentRef} className={JoinedNodesDisplayStyles.collapsibleContent}>
          {loadingMetadata ? (
            <div className={JoinedNodesDisplayStyles.loadingContainer}>
              <div className={JoinedNodesDisplayStyles.spinner} />
              <p>Loading datasets...</p>
            </div>
          ) : metadata && Array.isArray(metadata.dataset) && metadata.dataset.length > 0 ? (
            metadata.dataset.map((ds, idx) => (
              <DatasetCard key={idx} dataset={ds} />
            ))
          ) : (
            <p className={JoinedNodesDisplayStyles.muted}>No datasets available.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Access modal that displays joined nodes with their DCAT description
const JoinedNodesDisplay = ({ isOpen, joinedNodes, onClose, onAccessJoinedNodes, accessingNode }) => {
  return (
    <OverlayWrapper isOpen={isOpen} closeModal={onClose}>
      <div className={JoinedNodesDisplayStyles.modalContent}>
        <div className={JoinedNodesDisplayStyles.header}>
          <h2 className={JoinedNodesDisplayStyles.title}>Joined Nodes</h2>
          <button className={JoinedNodesDisplayStyles.closeBtn} onClick={onClose} aria-label="Close">
            <IoMdClose />
          </button>
        </div>

        <div className={JoinedNodesDisplayStyles.body}>
          {!joinedNodes || joinedNodes.length === 0 ? (
            <p className={JoinedNodesDisplayStyles.muted}>No joined nodes found.</p>
          ) : (
            <div className={JoinedNodesDisplayStyles.nodeList}>
              {joinedNodes.map((node) => (
                <JoinedNodeCard key={node.nodeId} node={node} />
              ))}
            </div>
          )}
        </div>

        <div className={JoinedNodesDisplayStyles.footer}>
          <button
            className={JoinedNodesDisplayStyles.accessButton}
            onClick={onAccessJoinedNodes}
            disabled={accessingNode}
          >
            {accessingNode ? "Accessing..." : "Access joined nodes"}
          </button>
        </div>
      </div>
    </OverlayWrapper>
  );
}

export default JoinedNodesDisplay;
