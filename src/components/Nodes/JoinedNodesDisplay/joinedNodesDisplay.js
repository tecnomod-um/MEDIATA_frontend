import React, { useState, useRef, useEffect } from "react";
import OverlayWrapper from "../../Unused/OverlayWrapper/overlayWrapper";
import { IoMdClose } from "react-icons/io";
import styles from "./joinedNodesDisplay.module.css";
import DatasetCard from "../MetadataDisplay/datasetCard";
import { getNodeMetadata } from "../../../util/petitionHandler";

const JoinedNodeCard = ({ node }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [metadata, setMetadata] = useState(null);

  // For smooth height animation
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

  // Update max-height whenever toggling or when metadata loads
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(isExpanded ? contentRef.current.scrollHeight : 0);
    }
  }, [isExpanded, metadata]);

  return (
    <div className={styles.nodeCard}>
      <div className={styles.nodeHeader}>
        <div className={styles.nodeInfo}>
          <h4 className={styles.nodeName}>{node.name}</h4>
          <p className={styles.nodeDesc}>
            {node.description || "No description provided."}
          </p>
        </div>

        {/* The toggle button (fixed width). If loading, show only spinner. */}
        <button
          className={styles.toggleButton}
          onClick={!loadingMetadata ? toggleExpansion : undefined}
        >
          {loadingMetadata ? (
            <div className={styles.smallSpinner} />
          ) : (
            isExpanded ? "Hide datasets" : "Show datasets"
          )}
        </button>
      </div>

      {/* Smoothly collapsible content */}
      <div
        className={styles.collapsibleWrapper}
        style={{ maxHeight: `${contentHeight}px` }}
      >
        <div ref={contentRef} className={styles.collapsibleContent}>
          {loadingMetadata ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner} />
              <p>Loading datasets...</p>
            </div>
          ) : metadata && Array.isArray(metadata.dataset) && metadata.dataset.length > 0 ? (
            metadata.dataset.map((ds, idx) => (
              <DatasetCard key={idx} dataset={ds} />
            ))
          ) : (
            <p className={styles.muted}>No datasets available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const JoinedNodesDisplay = ({
  isOpen,
  joinedNodes,
  onClose,
  onAccessJoinedNodes,
  accessingNode
}) => {
  return (
    <OverlayWrapper isOpen={isOpen} closeModal={onClose}>
      <div className={styles.modalContent}>
        <div className={styles.header}>
          <h2 className={styles.title}>Joined Nodes</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <IoMdClose />
          </button>
        </div>

        <div className={styles.body}>
          {!joinedNodes || joinedNodes.length === 0 ? (
            <p className={styles.muted}>No joined nodes found.</p>
          ) : (
            <div className={styles.nodeList}>
              {joinedNodes.map((node) => (
                <JoinedNodeCard key={node.nodeId} node={node} />
              ))}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button 
            className={styles.accessButton} 
            onClick={onAccessJoinedNodes}
            disabled={accessingNode} // Disable during access
          >
            {accessingNode ? "Accessing..." : "Access joined nodes"}
          </button>
        </div>
      </div>
    </OverlayWrapper>
  );
};

export default JoinedNodesDisplay;
