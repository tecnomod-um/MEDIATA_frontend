import React, { useState, useRef, useEffect } from "react";
import { FiChevronDown } from "react-icons/fi";
import styles from "./compareFilesModal.module.css";

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
      <h4 className={styles.subheading} onClick={toggle}>
        <span>{title}</span>
        {badge !== undefined && <span className={styles.badge}>{badge}</span>}
        <span className={styles.arrowContainer}>
          <FiChevronDown
            className={`${styles.arrowIcon} ${
              isCollapsed ? styles.collapsed : styles.expanded
            }`}
          />
        </span>
      </h4>
      <div
        ref={contentRef}
        className={styles.collapsibleContent}
        style={{ height: height, opacity: isCollapsed ? 0 : 1 }}
      >
        {children}
      </div>
    </>
  );
};

export default CollapsibleSection;
