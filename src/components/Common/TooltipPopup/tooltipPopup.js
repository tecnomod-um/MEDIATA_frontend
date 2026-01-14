// Tooltip popup component with auto-positioning and arrow pointer
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { CSSTransition } from "react-transition-group";
import TooltipPopupStyles from "./tooltipPopup.module.css";

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

const TooltipPopup = ({ message, buttonRef, onClose, offsetY = 0, autoHideMs = 3000, viewportMargin = 10, arrowWidth = 18, arrowHeight = 12 }) => {
  const tooltipRef = useRef(null);
  const [show, setShow] = useState(true);

  const [pos, setPos] = useState({
    top: 0,
    left: 0,
    clipPath: `polygon(0 0, 100% 0, 100% calc(100% - 12px), 55% calc(100% - 12px), 50% 100%, 45% calc(100% - 12px), 0 calc(100% - 12px))`,
  });

  useLayoutEffect(() => {
    const el = tooltipRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      queueMicrotask(() => window.dispatchEvent(new Event("resize")));
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const computeClipPath = (placement, arrowX) => {
    const half = arrowWidth / 2;

    if (placement === "top") {
      return `polygon(
        0 0,
        100% 0,
        100% calc(100% - ${arrowHeight}px),
        calc(${arrowX}px + ${half}px) calc(100% - ${arrowHeight}px),
        ${arrowX}px 100%,
        calc(${arrowX}px - ${half}px) calc(100% - ${arrowHeight}px),
        0 calc(100% - ${arrowHeight}px)
      )`;
    }

    return `polygon(
      0 ${arrowHeight}px,
      calc(${arrowX}px - ${half}px) ${arrowHeight}px,
      ${arrowX}px 0,
      calc(${arrowX}px + ${half}px) ${arrowHeight}px,
      100% ${arrowHeight}px,
      100% 100%,
      0 100%
    )`;
  };

  const updatePosition = useMemo(() => {
    return () => {
      const anchor = buttonRef?.current;
      const tip = tooltipRef.current;
      if (!anchor || !tip) return;

      const rect = anchor.getBoundingClientRect();
      const tipW = tip.offsetWidth;
      const tipH = tip.offsetHeight;
      if (!tipW || !tipH) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const targetX = rect.left + rect.width / 2;

      let placement = "top";
      let top = rect.top - offsetY - tipH;

      if (top < viewportMargin) {
        placement = "bottom";
        top = rect.bottom + offsetY;
        top = clamp(top, viewportMargin, vh - viewportMargin - tipH);
      }

      const left = clamp(
        targetX - tipW / 2,
        viewportMargin,
        vw - viewportMargin - tipW
      );

      const arrowX = clamp(
        targetX - left,
        arrowWidth / 2 + 6,
        tipW - arrowWidth / 2 - 6
      );

      setPos({
        top,
        left,
        clipPath: computeClipPath(placement, arrowX),
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buttonRef, offsetY, viewportMargin, arrowWidth, arrowHeight]);

  useLayoutEffect(() => {
    if (!show) return;

    let rafId = 0;
    let tries = 0;
    const tryPosition = () => {
      tries += 1;
      updatePosition();
      if (!buttonRef?.current && tries < 10) {
        rafId = requestAnimationFrame(tryPosition);
      }
    };

    tryPosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [show, updatePosition, buttonRef]);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), autoHideMs);
    return () => clearTimeout(t);
  }, [show, autoHideMs]);

  const renderMessage = () => {
    if (typeof message !== "string") return message;
    const parts = message.split(/\r?\n|\\n/g);
  
    return parts.map((part, i) => (
      <React.Fragment key={i}>
        {part}
        {i < parts.length - 1 && <br />}
      </React.Fragment>
    ));
  };
  
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
      onEnter={() => {
        requestAnimationFrame(updatePosition);
      }}
      onExited={() => {
        onClose?.();
      }}
    >
      <div
        ref={tooltipRef}
        className={TooltipPopupStyles.popup}
        style={{
          position: "fixed",
          top: `${pos.top}px`,
          left: `${pos.left}px`,
          clipPath: pos.clipPath,
          transform: "none",
        }}
      >
 <div className={TooltipPopupStyles.content}>{renderMessage()}</div>
      </div>
    </CSSTransition>
  );

  return ReactDOM.createPortal(tooltipElement, document.body);
};

export default TooltipPopup;
