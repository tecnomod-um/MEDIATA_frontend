import React from "react";
import LandingDiscoveryStyles from "./landingIcons.module.css";

export default function LandingDiscovery({ size, title = "Search document" }) {
  const svgStyle = size ? { width: size, height: size } : {};

  return (
    <svg
      className={`${LandingDiscoveryStyles.iconSvg} iconSvg`}
      style={svgStyle}
      viewBox="0 0 128 128"
      role="img"
      aria-label={title}
      focusable="false"
    >
      <defs data-testid="ld-defs">
        <filter id="ld_shadow" x="-50%" y="-50%" width="200%" height="200%" data-testid="ld-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity=".25" />
        </filter>
        <path
          id="ld_scanPath"
          data-testid="ld-scanPath"
          d="M 48 70 a 20 14 0 1 0 40 0 a 20 14 0 1 0 -40 0"
          fill="none"
        />
      </defs>

      <rect
        x="8"
        y="8"
        width="112"
        height="112"
        rx="18"
        ry="18"
        className={`${LandingDiscoveryStyles.iconSquare} iconSquare`}
        data-testid="ld-iconSquare"
      />
   <rect
        x="8"
        y="8"
        width="112"
        height="112"
        rx="18"
        ry="18"
        className={LandingDiscoveryStyles.iconSquare}
      />
      <g className={LandingDiscoveryStyles.docStroke}>
        <path
          d="M34,22 H86 L94,30 V106 H34 Z"
          className={LandingDiscoveryStyles.docFill}
        />
        <path
          d="M84,22 V32 H94"
          className={LandingDiscoveryStyles.foldEdge}
        />
        <line x1="44" y1="54" x2="84" y2="54" className={LandingDiscoveryStyles.docLine} />
        <line x1="44" y1="66" x2="84" y2="66" className={LandingDiscoveryStyles.docLine} />
        <line x1="44" y1="78" x2="84" y2="78" className={LandingDiscoveryStyles.docLine} />
      </g>
      <g filter="url(#ld_shadow)">
        <g className={LandingDiscoveryStyles.magnifier} data-testid="ld-magnifier">
          <circle cx="0" cy="0" r="12" className={LandingDiscoveryStyles.lens} />
          <line x1="8" y1="8" x2="22" y2="22" className={LandingDiscoveryStyles.handle} />
          <circle cx="-4" cy="-4" r="5" className={LandingDiscoveryStyles.glint} />
        </g>
        <animateMotion
          dur="4.8s"
          repeatCount="indefinite"
          rotate="0"
          keyTimes="0;0.5;1"
          calcMode="spline"
          keySplines="0.25 0.1 0.25 1; 0.25 0.1 0.25 1"
          data-testid="ld-animateMotion"
        >
          <mpath href="#ld_scanPath" />
        </animateMotion>
      </g>
    </svg>
  );
}
