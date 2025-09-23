import React from "react";
import styles from "./landingIcons.module.css";

export default function LandingStandards({ size, title = "Standards supported" }) {
  const svgStyle = size ? { width: size, height: size } : {};

  const piecePath = (x, y, s, sides) => {
    const a = s * 0.32, b = s * 0.68, r = s * 0.18, k = r * 1.3;
    const kyTop    = (t) => (t === "out" ? -k :  k);
    const kyBottom = (t) => (t === "out" ?  k : -k);
    const kxRight  = (t) => (t === "out" ?  k : -k);
    const kxLeft   = (t) => (t === "out" ? -k :  k);
    return [
      `M ${x} ${y}`, `H ${x + a}`,
      `C ${x + a + r} ${y + kyTop(sides.top)} ${x + b - r} ${y + kyTop(sides.top)} ${x + b} ${y}`,
      `H ${x + s}`, `V ${y + a}`,
      `C ${x + s + kxRight(sides.right)} ${y + a + r} ${x + s + kxRight(sides.right)} ${y + b - r} ${x + s} ${y + b}`,
      `V ${y + s}`, `H ${x + b}`,
      `C ${x + b - r} ${y + s + kyBottom(sides.bottom)} ${x + a + r} ${y + s + kyBottom(sides.bottom)} ${x + a} ${y + s}`,
      `H ${x}`, `V ${y + b}`,
      `C ${x + kxLeft(sides.left)} ${y + b - r} ${x + kxLeft(sides.left)} ${y + a + r} ${x} ${y + a}`, "Z",
    ].join(" ");
  };

  const S=30, X0=28, Y0=34, DX=34, DY=34;
  const A = { top: "out", right: "in",  bottom: "out", left: "in"  };
  const B = { top: "in",  right: "out", bottom: "in",  left: "out" };

  return (
    <svg
      className={`${styles.iconSvg} iconSvg`}
      style={svgStyle}
      viewBox="0 0 128 128"
      role="img"
      aria-label={title}
      focusable="false"
    >
      <rect
        x="8" y="8" width="112" height="112" rx="18" ry="18"
        className={`${styles.iconSquare} iconSquare`}
        data-testid="ls-iconSquare"
      />

      {/* TL (A) */}
      <path d={piecePath(X0, Y0, S, A)} className={styles.puzzlePiece} data-testid="ls-puzzlePiece" />
      {/* BL (B) */}
      <path d={piecePath(X0, Y0 + DY, S, B)} className={styles.puzzlePiece} data-testid="ls-puzzlePiece" />
      {/* BR (A) */}
      <path d={piecePath(X0 + DX, Y0 + DY, S, A)} className={styles.puzzlePiece} data-testid="ls-puzzlePiece" />

      {/* TR (B) — animated/movable */}
      <g className={styles.puzzleMover} data-testid="ls-puzzleMover">
        <path d={piecePath(X0 + DX, Y0, S, B)} className={styles.puzzlePiece} data-testid="ls-puzzlePiece" />
      </g>

      {/* single explicit path test hook */}
      <path d={piecePath(X0, Y0, S, A)} className={styles.puzzlePiece} data-testid="ls-puzzlePiece-path" style={{ display: 'none' }} />
    </svg>
  );
}
