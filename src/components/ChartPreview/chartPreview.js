import React from "react";
import OverlayWrapper from "../OverlayWrapper/overlayWrapper";
import ChartPreviewStyles from "./chartPreview.module.css";

const ChartPreview = ({ isOpen, content, closeModal }) => {
  return (
    <OverlayWrapper isOpen={isOpen} closeModal={closeModal}>
      <span className={ChartPreviewStyles.chartContainer}>{content}</span>
    </OverlayWrapper>
  );
};

export default ChartPreview;
