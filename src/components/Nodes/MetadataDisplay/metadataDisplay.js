import React from "react";
import OverlayWrapper from "../../Common/OverlayWrapper/overlayWrapper";
import MetadataDisplayStyles from "./metadataDisplay.module.css";
import DatasetCard from "./datasetCard";
import { IoMdClose } from "react-icons/io";

// Component for rendering nested metadata display
const MetadataDisplay = ({ isOpen, metadata, loadingMetadata, accessingNode, headerColor, nodeName, nodeDescription, closeModal, onAccessNode }) => {
  return (
    <OverlayWrapper isOpen={isOpen} closeModal={closeModal}>
      <div className={MetadataDisplayStyles.modalContent}>
        <div
          className={MetadataDisplayStyles.header}
          style={{ backgroundColor: headerColor }}
        >
          <h2>{nodeName}</h2>
          <p>{nodeDescription || "No node description provided."}</p>
          <button
            className={MetadataDisplayStyles.closeBtn}
            onClick={closeModal}
          >
            <IoMdClose />
          </button>
        </div>
        <div className={MetadataDisplayStyles.body}>
          {loadingMetadata ? (
            <div className={MetadataDisplayStyles.placeholderContainer}>
              <div className={MetadataDisplayStyles.spinner} />
              <p className={MetadataDisplayStyles.loadingText}>Loading metadata...</p>
            </div>
          ) : !metadata ? (
            <div className={MetadataDisplayStyles.placeholderContainer}>
              <p className={MetadataDisplayStyles.muted}>No metadata available.</p>
            </div>
          ) : (
            <>
              {metadata["@context"] && (
                <p className={MetadataDisplayStyles.contextLine}>
                  <strong>Context:</strong> {metadata["@context"]}
                </p>
              )}
              {Array.isArray(metadata.dataset) && metadata.dataset.length > 0 ? (
                <div className={MetadataDisplayStyles.datasetsContainer}>
                  {metadata.dataset.map((ds, index) => (
                    <DatasetCard key={index} dataset={ds} />
                  ))}
                </div>
              ) : (
                <p className={MetadataDisplayStyles.muted}>
                  No datasets available.
                </p>
              )}
            </>
          )}
        </div>

        <div className={MetadataDisplayStyles.footer}>
          <button
            className={MetadataDisplayStyles.accessButton}
            onClick={onAccessNode}
            disabled={accessingNode}
          >
            {accessingNode ? "Accessing..." : "Access the node"}
          </button>
        </div>
      </div>
    </OverlayWrapper>
  );
};

export default MetadataDisplay;
