// Drag and drop overlay component (unused)
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { CSSTransition } from "react-transition-group";
import DragAndDropOverlayStyles from "./dragAndDropOverlay.module.css";

function DragAndDropOverlay({ onDrop }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  useEffect(() => {
    const handleDragEnter = (e) => {
      e.preventDefault();
      setDragCounter((prevCount) => prevCount + 1);
    };

    const handleDragOver = (e) => {
      e.preventDefault();
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      setDragCounter((prevCount) => prevCount - 1);
    };

    const handleDrop = (e) => {
      e.preventDefault();
      setIsDragOver(false);
      setDragCounter(0);
      if (e.dataTransfer.files.length > 0) {
        onDrop(e.dataTransfer.files);
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [onDrop]);

  useEffect(() => {
    setIsDragOver(dragCounter > 0);
  }, [dragCounter]);

  let overlayContainer = document.getElementById("overlay");
  if (!overlayContainer) {
    overlayContainer = document.createElement("div");
    overlayContainer.id = "overlay";
    document.body.appendChild(overlayContainer);
  }

  return ReactDOM.createPortal(
    <CSSTransition
      in={isDragOver}
      classNames={{
        enter: DragAndDropOverlayStyles.fadeEnter,
        enterActive: DragAndDropOverlayStyles.fadeEnterActive,
        exit: DragAndDropOverlayStyles.fadeExit,
        exitActive: DragAndDropOverlayStyles.fadeExitActive,
      }}
      timeout={200}
      unmountOnExit
    >
      <div
        className={DragAndDropOverlayStyles.dropOverlay}
        onDragOver={(e) => e.preventDefault()}
      >
        <div
          className={DragAndDropOverlayStyles.dropSquare}
          onDragOver={(e) => e.preventDefault()}
        >
          Drop .csv files here
        </div>
      </div>
    </CSSTransition>,
    overlayContainer
  );
}

export default DragAndDropOverlay;
