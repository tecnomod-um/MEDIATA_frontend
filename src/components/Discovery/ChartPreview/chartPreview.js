// Modal component for previewing charts in full screen
import React from "react";
import OverlayWrapper from "../../Unused/OverlayWrapper/overlayWrapper";
import ChartPreviewStyles from "./chartPreview.module.css";

const ChartPreview = ({ isOpen, content, closeModal }) => {
  return (
    <OverlayWrapper isOpen={isOpen} closeModal={closeModal}>
      <div className={ChartPreviewStyles.chartContainer}>{content}</div>
    </OverlayWrapper>
  );
}

export default ChartPreview;
