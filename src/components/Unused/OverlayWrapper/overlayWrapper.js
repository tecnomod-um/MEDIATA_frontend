import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CSSTransition } from "react-transition-group";
import OverlayWrapperStyles from "./overlayWrapper.module.css";

function OverlayWrapper({ isOpen, children, closeModal, maxWidth }) {
  // Modal behavior
  const modalRef = useRef(null);
  const [mouseDownOnBackdrop, setMouseDownOnBackdrop] = useState(false);

  // Get focus on open
  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
    }
  }, [isOpen]);

  const handleBackdropMouseDown = (e) => {
    if (e.target === e.currentTarget) setMouseDownOnBackdrop(true);
  };
  const handleBackdropMouseUp = (e) => {
    if (mouseDownOnBackdrop && e.target === e.currentTarget) closeModal();
    setMouseDownOnBackdrop(false);
  };
  return createPortal(
    <CSSTransition
      in={isOpen}
      timeout={{ enter: 150, exit: 0 }}
      classNames={{
        enter: OverlayWrapperStyles.fadeEnter,
        enterActive: OverlayWrapperStyles.fadeEnterActive,
        exit: OverlayWrapperStyles.fadeExit,
        exitActive: OverlayWrapperStyles.fadeExitActive,
      }}
      nodeRef={modalRef}
      unmountOnExit
    >
      <div className={OverlayWrapperStyles.darkBG}
        onMouseDown={handleBackdropMouseDown}
        onMouseUp={handleBackdropMouseUp}
        ref={modalRef}>
        <div className={OverlayWrapperStyles.modal}
          style={{ maxWidth: maxWidth }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>

    </CSSTransition>,
    document.getElementById("overlay")
  );
}

export default OverlayWrapper;
