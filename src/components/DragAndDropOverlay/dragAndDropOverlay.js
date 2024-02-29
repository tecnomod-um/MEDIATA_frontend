import React from 'react';
import ReactDOM from 'react-dom';
import { CSSTransition } from 'react-transition-group';
import DragAndDropOverlayStyles from "./dragAndDropOverlay.module.css";

function DragAndDropOverlay({ onDrop, isVisible }) {
    const handleDragOver = (e) => {
        e.stopPropagation();
        e.preventDefault();
    };

    const handleSquareDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop(e.dataTransfer.files[0]);
    };

    let overlayContainer = document.getElementById('overlay');
    if (!overlayContainer) {
        overlayContainer = document.createElement('div');
        overlayContainer.id = 'overlay';
        document.body.appendChild(overlayContainer);
    }

    return ReactDOM.createPortal(
        <CSSTransition
            in={isVisible}
            classNames={{
                enter: DragAndDropOverlayStyles.fadeEnter,
                enterActive: DragAndDropOverlayStyles.fadeEnterActive,
                exit: DragAndDropOverlayStyles.fadeExit,
                exitActive: DragAndDropOverlayStyles.fadeExitActive,
            }}
            timeout={200}
            unmountOnExit
        >
            <div className={DragAndDropOverlayStyles.dropOverlay} onDragOver={handleDragOver}>
                <div className={DragAndDropOverlayStyles.dropSquare} onDrop={handleSquareDrop} onDragOver={handleDragOver}>
                    Drop .csv file here
                </div>
            </div>
        </CSSTransition>,
        overlayContainer
    );
}

export default DragAndDropOverlay;
