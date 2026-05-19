import React from "react";
import OverlayWrapper from "../../Common/OverlayWrapper/overlayWrapper";
import fairDataPointIcon from "../../../resources/images/FDPicon.svg";
import fairDataPointIconDisabled from "../../../resources/images/FDPiconDisabled.svg";
import MetadataDisplayStyles from "./metadataDisplay.module.css";
import DatasetCard from "./datasetCard";
import { IoMdClose } from "react-icons/io";
import { toast } from "react-toastify";

const MetadataDisplay = ({
  isOpen,
  metadata,
  fairDataPointEnabled,
  fairDataPointUrl,
  loadingMetadata,
  accessingNode,
  headerColor,
  nodeName,
  nodeDescription,
  closeModal,
  onAccessNode,
}) => {
  const datasets = Array.isArray(metadata?.dataset) ? metadata.dataset : [];
  const hasFairDataPointStatus = typeof fairDataPointEnabled === "boolean";
  const canCopyFairDataPointUrl =
    fairDataPointEnabled &&
    typeof fairDataPointUrl === "string" &&
    fairDataPointUrl.trim() !== "";

  const copyFairDataPointUrl = async () => {
    if (!canCopyFairDataPointUrl) return;

    try {
      await navigator.clipboard.writeText(fairDataPointUrl);
      toast.success("FAIR URL copied to clipboard.");
    } catch (error) {
      toast.error("Could not copy the FAIR URL.");
    }
  };

  const metadataSummaryItems = [
    metadata?.["@context"] && {
      label: "Context",
      value: metadata["@context"],
    },
    metadata?.["@type"] && {
      label: "Type",
      value: metadata["@type"],
    },
    metadata?.sourceFile && {
      label: "Source File",
      value: metadata.sourceFile,
    },
  ].filter(Boolean);

  const renderFairDataPointIcon = () => {
    if (!hasFairDataPointStatus) return null;

    const isDisabled = !fairDataPointEnabled;
    const iconTitle = canCopyFairDataPointUrl
      ? `FAIR Data Point: ${fairDataPointUrl}`
      : fairDataPointEnabled
        ? "This node has a FAIR Data Point configured."
        : "This node has no FAIR Data Point configured.";

    return (
      <button
        type="button"
        className={`${MetadataDisplayStyles.fdpButton} ${isDisabled ? MetadataDisplayStyles.fdpButtonDisabled : ""
          } ${canCopyFairDataPointUrl ? MetadataDisplayStyles.fdpButtonInteractive : ""}`}
        title={iconTitle}
        aria-label={iconTitle}
        onClick={copyFairDataPointUrl}
        disabled={!canCopyFairDataPointUrl}
      >
        <span className={MetadataDisplayStyles.fdpIconBadge}>
          <img
            src={fairDataPointEnabled ? fairDataPointIcon : fairDataPointIconDisabled}
            alt=""
            className={MetadataDisplayStyles.fdpIcon}
          />
        </span>

        <span className={MetadataDisplayStyles.fdpButtonLabel}>
          FAIR Data Point
        </span>
      </button>
    );
  };

  return (
    <OverlayWrapper isOpen={isOpen} closeModal={closeModal}>
      <div className={MetadataDisplayStyles.modalContent}>
        <div
          className={MetadataDisplayStyles.header}
          style={{ "--header-bg": headerColor }}
        >
          {renderFairDataPointIcon()}

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
                {metadataSummaryItems.map(({ label, value }) => (
                  <p key={label} className={MetadataDisplayStyles.contextLine}>
                    <span className={MetadataDisplayStyles.summaryLabel}>{label}:</span>{" "}
                    <span className={MetadataDisplayStyles.summaryValue}>{value}</span>
                  </p>
                ))}
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
