// Security icon SVG component for landing page
import React from "react";
import styles from "./landingIcons.module.css";

export default function LandingSecurity({ size = 170, title = "Security" }) {
  const svgStyle = size ? { width: size, height: size } : {};

  return (
    <svg
      className={`${styles.iconSvg} ${styles.iconSvgLarger} iconSvg iconSvgLarger`}
      style={svgStyle}
      viewBox="0 0 128 128"
      role="img"
      aria-label={title}
      focusable="false"
    >
      <defs>
        <path id="sec_arc_outer" d="M 24 45 A 52 52 0 0 1 86 106" fill="none" />
        <path id="sec_arc_inner" d="M 24 50 A 48 48 0 0 1 82 106" fill="none" />
        <path id="sec_L" d="M 170 50 Q 150 52 66 56 Q 40 20 20 8" fill="none" />
        <path id="sec_R" d="M 150 68 Q 96 62 80 58 Q 104 92 120 112" fill="none" />
        <path id="sec_T" d="M 64 8 L 70 48 L 120 40" fill="none" />
      </defs>

      {/* background */}
      <rect
        x="8" y="8" width="112" height="112" rx="18" ry="18"
        className={`${styles.iconSquare} iconSquare`}
        data-testid="ls-iconSquare"
      />

      {/* small document */}
      <g className={styles.docStroke}>
        <path d="M26,64 H46 L54,72 V98 H26 Z" className={styles.docFill} />
        <path d="M44,64 V73 H54" className={styles.foldEdge} />
      </g>

      {/* shield arcs */}
      <g className={styles.shieldArcGroup} data-testid="ls-shieldArcGroup">
        <use href="#sec_arc_outer" className={styles.shieldArc} data-testid="ls-shieldArc" />
        <use href="#sec_arc_inner" className={styles.shieldArcInner} data-testid="ls-shieldArcInner" />
      </g>

      {/* LEFT arrow */}
      <g className={styles.arrow} data-testid="ls-arrow">
        <g className={styles.arrowGlyph}>
          <line x1="0" y1="0" x2="-5" y2="0" />
          <polygon points="10,0 2,-3 2,3" />
        </g>
        {/* only one animateMotion gets a testid to avoid “multiple” errors */}
        <animateMotion dur="1.4s" rotate="auto" repeatCount="indefinite" begin="0s" data-testid="ls-arrow-animateMotion">
          <mpath href="#sec_L" />
        </animateMotion>
        <animate attributeName="opacity" dur="1.4s" values="0;1;1;0" keyTimes="0;0.1;0.9;1" repeatCount="indefinite" begin="0s" />
      </g>

      {/* RIGHT arrow */}
      <g className={styles.arrow} data-testid="ls-arrow">
        <g className={styles.arrowGlyph}>
          <line x1="0" y1="0" x2="-5" y2="0" />
          <polygon points="10,0 2,-3 2,3" />
        </g>
        <animateMotion dur="1.4s" rotate="auto" repeatCount="indefinite" begin="0.4s">
          <mpath href="#sec_R" />
        </animateMotion>
        <animate attributeName="opacity" dur="1.4s" values="0;1;1;0" keyTimes="0;0.1;0.9;1" repeatCount="indefinite" begin="0.4s" />
      </g>

      {/* TOP arrow */}
      <g className={styles.arrow} data-testid="ls-arrow">
        <g className={styles.arrowGlyph}>
          <line x1="0" y1="0" x2="-5" y2="0" />
          <polygon points="10,0 2,-3 2,3" />
        </g>
        <animateMotion dur="1.4s" rotate="auto" repeatCount="indefinite" begin="0.8s">
          <mpath href="#sec_T" />
        </animateMotion>
        <animate attributeName="opacity" dur="1.4s" values="0;1;1;0" keyTimes="0;0.1;0.9;1" repeatCount="indefinite" begin="0.8s" />
      </g>
    </svg>
  );
}
