import React from "react";
import OverlayWrapper from "../../Common/OverlayWrapper/overlayWrapper";
import ChartPreviewStyles from "./chartPreview.module.css";

// Modal component for previewing charts in full screen
const ChartPreview = ({ isOpen, content, closeModal }) => {
  return (
    <OverlayWrapper isOpen={isOpen} closeModal={closeModal}>
      <div className={ChartPreviewStyles.chartContainer}>{content}</div>
    </OverlayWrapper>
  );
}

export default ChartPreview;
