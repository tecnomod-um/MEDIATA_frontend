import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CSSTransition } from 'react-transition-group';
import OverlayWrapperStyles from "./overlayWrapper.module.css";
import CloseIcon from "@mui/icons-material/Close";

function OverlayWrapper ({ isOpen, children, closeModal, maxWidth }) {
    // Modal behavior
    const modalRef = useRef(null);
    const [mouseDownOnBackdrop, setMouseDownOnBackdrop] = useState(false);

    // Get focus on open
    useEffect(() => {
        if (isOpen) {
            modalRef.current?.focus();
        }
    }, [isOpen]);

    const handleBackdropMouseDown = () => {
        setMouseDownOnBackdrop(true);
    }

    const handleBackdropMouseUp = () => {
        if (mouseDownOnBackdrop)
            closeModal();
        setMouseDownOnBackdrop(false);
    }

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
            <div className={OverlayWrapperStyles.darkBG} onMouseDown={handleBackdropMouseDown} onMouseUp={handleBackdropMouseUp} ref={modalRef}>
                <div
                    className={OverlayWrapperStyles.centered}
                    ref={modalRef}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                >
                    <div className={OverlayWrapperStyles.modal} style={{ maxWidth: maxWidth }} >
                        {children}
                    </div>
                </div>
                <button className={OverlayWrapperStyles.closeBtn} onClick={closeModal}>
                    <CloseIcon style={{ color: 'white', marginBottom: "-7px" }} />
                </button>
            </div>
        </CSSTransition>
        , document.getElementById('overlay')
    )
}

export default OverlayWrapper;
