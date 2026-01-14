// Integration icon SVG component for landing page
import React from "react";
import styles from "./landingIcons.module.css";

export default function LandingIntegration({ size, title = "Integrate documents" }) {
  const svgStyle = size ? { width: size, height: size } : {};

  return (
    <svg
      className={`${styles.iconSvg} iconSvg`}
      style={svgStyle}
      viewBox="0 0 128 128"
      role="img"
      aria-label={title}
      focusable="false"
    >
      {/* background */}
      <rect
        x="8" y="8" width="112" height="112" rx="18" ry="18"
        className={`${styles.iconSquare} iconSquare`}
        data-testid="li-iconSquare"
      />

      {/* left file */}
      <g className={styles.docStroke} data-testid="li-docGroup">
        <path d="M14,44 H34 L38,48 V80 H14 Z" className={styles.docFill} />
        <path d="M34,44 V48 H38" className={styles.foldEdge} />
      </g>

      {/* right file */}
      <g className={styles.docStroke} data-testid="li-docGroup">
        <path d="M90,44 H110 L114,48 V80 H90 Z" className={styles.docFill} />
        <path d="M110,44 V48 H114" className={styles.foldEdge} />
      </g>

      {/* central file */}
      <g className={styles.docStroke} data-testid="li-docGroup">
        <path d="M44,32 H84 V96 H44 Z" className={styles.docFillCentral} />
      </g>

      {/* animated bars */}
      <line x1="18" y1="56" x2="32" y2="56"
        className={`${styles.lineBlue} ${styles.barLeft1}`} data-testid="li-barLeft1" />
      <line x1="18" y1="68" x2="32" y2="68"
        className={`${styles.lineBlue} ${styles.barLeft2}`} data-testid="li-barLeft2" />
      <line x1="96" y1="56" x2="110" y2="56"
        className={`${styles.lineGreen} ${styles.barRight1}`} data-testid="li-barRight1" />
      <line x1="96" y1="68" x2="110" y2="68"
        className={`${styles.lineGreen} ${styles.barRight2}`} data-testid="li-barRight2" />
    </svg>
  );
}
