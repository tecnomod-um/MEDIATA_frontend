import React from "react";
import OverlayWrapper from "../../Common/OverlayWrapper/overlayWrapper";
import MetadataDisplayStyles from "./metadataDisplay.module.css";
import DatasetCard from "./datasetCard";
import { IoMdClose } from "react-icons/io";

const MetadataDisplay = ({
  isOpen,
  metadata,
  loadingMetadata,
  accessingNode,
  headerColor,
  nodeName,
  nodeDescription,
  closeModal,
  onAccessNode,
}) => {
  const datasets = Array.isArray(metadata?.dataset) ? metadata.dataset : [];

  return (
    <OverlayWrapper isOpen={isOpen} closeModal={closeModal}>
      <div className={MetadataDisplayStyles.modalContent}>
        <div
          className={MetadataDisplayStyles.header}
          style={{ "--header-bg": headerColor }}
        >
          <div className={MetadataDisplayStyles.modalTitle}>{nodeName}</div>
          <div className={MetadataDisplayStyles.modalDescription}>
            {nodeDescription || "No node description provided."}
          </div>

          <button
            type="button"
            className={MetadataDisplayStyles.closeBtn}
            onClick={closeModal}
            aria-label="Close metadata modal"
          >
            <IoMdClose />
          </button>
        </div>

        <div className={MetadataDisplayStyles.body}>
          {loadingMetadata ? (
            <div className={MetadataDisplayStyles.placeholderContainer}>
              <div className={MetadataDisplayStyles.spinner} />
              <p className={MetadataDisplayStyles.loadingText}>
                Loading metadata...
              </p>
            </div>
          ) : !metadata ? (
            <div className={MetadataDisplayStyles.placeholderContainer}>
              <p className={MetadataDisplayStyles.muted}>
                No metadata available.
              </p>
            </div>
          ) : (
            <>
              <div className={MetadataDisplayStyles.metadataSummary}>
                {metadata["@context"] && (
                  <p className={MetadataDisplayStyles.contextLine}>
                    <strong>Context:</strong> {metadata["@context"]}
                  </p>
                )}

                {metadata["@type"] && (
                  <p className={MetadataDisplayStyles.contextLine}>
                    <strong>Type:</strong> {metadata["@type"]}
                  </p>
                )}

                {metadata.sourceFile && (
                  <p className={MetadataDisplayStyles.contextLine}>
                    <strong>Source File:</strong> {metadata.sourceFile}
                  </p>
                )}
              </div>

              {datasets.length > 0 ? (
                <div className={MetadataDisplayStyles.datasetsContainer}>
                  {datasets.map((dataset, index) => (
                    <DatasetCard
                      key={dataset.uri || dataset.identifier || index}
                      dataset={dataset}
                    />
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
            type="button"
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
