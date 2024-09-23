import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import TooltipPopupStyles from "./tooltipPopup.module.css";
import { CSSTransition } from 'react-transition-group';

const TooltipPopup = ({ message, buttonRef, onClose }) => {
    const [show, setShow] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [width, setWidth] = useState(null);
    const [clipPath, setClipPath] = useState(`polygon(0% 0%, 100% 0%, 100% 80%, 55% 80%, 50% 100%, 45% 80%, 0% 80%)`);
    const tooltipRef = useRef(null);

    useEffect(() => {
        setShow(true);
        if (!width) return;

        const updatePosition = () => {
            if (buttonRef.current) {
                const buttonRect = buttonRef.current.getBoundingClientRect();

                let top = (buttonRect.top - 15 + window.scrollY - buttonRect.height);
                let left = buttonRect.left + window.scrollX + buttonRect.width / 2;

                // Check tooltip overflows
                if ((left + (width / 2)) > window.innerWidth) {
                    left = window.innerWidth - (width / 2 + 10);
                    setClipPath(`polygon(0% 0%, 100% 0%, 100% 80%, 90% 80%, 85% 100%, 80% 80%, 0% 80%)`);
                } else if (left - (width / 2) < 0) {
                    left = width / 2 + 10;
                    setClipPath(`polygon(0% 0%, 100% 0%, 100% 80%, 10% 80%, 15% 100%, 20% 80%, 0% 80%)`);
                }
                setPosition({ top, left });
            }
        }

        // Update position when window resizes
        window.addEventListener('resize', updatePosition);

        // Initial position update
        updatePosition();

        const timer = setTimeout(() => setShow(false), 3000);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updatePosition);
            if (onClose) onClose();
        };
    }, [buttonRef, onClose, width]);


    const tooltipElement = (
        <CSSTransition
            in={show}
            timeout={150}
            classNames={{
                enter: TooltipPopupStyles.fadeEnter,
                enterActive: TooltipPopupStyles.fadeEnterActive,
                exit: TooltipPopupStyles.fadeExit,
                exitActive: TooltipPopupStyles.fadeExitActive,
            }}
            unmountOnExit
            onEntering={() => {
                const currentWidth = tooltipRef.current ? tooltipRef.current.clientWidth : 0;
                if (currentWidth > 0 && currentWidth !== width) {
                    setWidth(currentWidth);
                }
            }}
        >
            <div ref={tooltipRef} className={TooltipPopupStyles.popup}
                style={{ clipPath, top: `${position.top}px`, left: `${position.left}px` }}>
                <div className={TooltipPopupStyles.content}>{message}</div>
            </div>
        </CSSTransition >
    )

    return ReactDOM.createPortal(
        tooltipElement,
        document.body
    )
}

export default TooltipPopup;
