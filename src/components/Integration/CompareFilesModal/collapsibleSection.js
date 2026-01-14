import React, { useState, useRef, useEffect } from "react";
import { FiChevronDown } from "react-icons/fi";
import CopareFilesModalStyles from "./compareFilesModal.module.css";

const CollapsibleSection = ({ title, badge, isCollapsed, toggle, children }) => {
  const contentRef = useRef(null);
  const [height, setHeight] = useState("0px");

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isCollapsed ? "0px" : `${contentRef.current.scrollHeight}px`);
    }
  }, [isCollapsed, children]);

  return (
    <>
      <h4 
        className={CopareFilesModalStyles.subheading} 
        onClick={toggle}
        role="button"
        aria-expanded={!isCollapsed}
        aria-controls={`section-${title.replace(/\s+/g, '-')}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <span>{title}</span>
        {badge !== undefined && <span className={CopareFilesModalStyles.badge}>{badge}</span>}
        <span className={CopareFilesModalStyles.arrowContainer}>
          <FiChevronDown
            className={`${CopareFilesModalStyles.arrowIcon} ${
              isCollapsed ? CopareFilesModalStyles.collapsed : CopareFilesModalStyles.expanded
            }`}
            aria-hidden="true"
          />
        </span>
      </h4>
      <div
        ref={contentRef}
        className={CopareFilesModalStyles.collapsibleContent}
        style={{ height: height, opacity: isCollapsed ? 0 : 1 }}
        id={`section-${title.replace(/\s+/g, '-')}`}
        role="region"
        aria-label={title}
      >
        {children}
      </div>
    </>
  );
}

export default CollapsibleSection;
