import React from "react";
import RdfConnectionStyles from "./rdf.module.css";

const RdfConnection = ({ connections, cards }) => {
  const computedStyle = getComputedStyle(document.documentElement);
  const cardWidth = parseFloat(computedStyle.getPropertyValue('--card-width')) || 220;
  const cardHeight = parseFloat(computedStyle.getPropertyValue('--card-height')) || 100;
  
  if (!cards || cards.length === 0) return null;

  let minX = cards[0].x;
  let maxX = cards[0].x + cardWidth;
  let minY = cards[0].y;
  let maxY = cards[0].y + cardHeight;

  cards.slice(1).forEach((card) => {
    minX = Math.min(minX, card.x);
    maxX = Math.max(maxX, card.x + cardWidth);
    minY = Math.min(minY, card.y);
    maxY = Math.max(maxY, card.y + cardHeight);
  });

  const padding = 20;
  const paddingX = (maxX - minX) * 0.2 + padding;
  const paddingY = (maxY - minY) * 0.2 + padding;

  const getEdgePoint = (start, target) => {
    const targetCenter = {
      x: target.x + cardWidth / 2,
      y: target.y + cardHeight / 2
    };

    const angle = Math.atan2(targetCenter.y - start.y, targetCenter.x - start.x);
    const direction = {
      x: Math.cos(angle),
      y: Math.sin(angle)
    };

    const halfWidth = cardWidth / 2;
    const halfHeight = cardHeight / 2;
    const tx = direction.x !== 0
      ? (direction.x > 0 ? halfWidth : -halfWidth) / direction.x
      : Infinity;
    const ty = direction.y !== 0
      ? (direction.y > 0 ? halfHeight : -halfHeight) / direction.y
      : Infinity;
    
    const t = Math.min(tx, ty);

    return {
      x: targetCenter.x - direction.x * t,
      y: targetCenter.y - direction.y * t
    };
  };

  return (
    <svg
      className={RdfConnectionStyles.connections}
      style={{
        position: "absolute",
        left: minX - paddingX,
        top: minY - paddingY,
        width: maxX - minX + paddingX * 2,
        height: maxY - minY + paddingY * 2,
        pointerEvents: "none"
      }}
      role="img"
      aria-label="RDF connections"
      viewBox={`${minX - paddingX} ${minY - paddingY} ${maxX - minX + paddingX * 2} ${maxY - minY + paddingY * 2}`}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="12"
          markerHeight="10"
          refX="10"
          refY="5"
          orient="auto"
        >
          <polygon points="0 0, 12 5, 0 10" fill="black" />
        </marker>
      </defs>
      {connections.map((conn) => {
        const fromCard = cards.find((c) => c.id === conn.from);
        const toCard = cards.find((c) => c.id === conn.to);
        if (!fromCard || !toCard) return null;
        const start = {
          x: fromCard.x + cardWidth / 2,
          y: fromCard.y + cardHeight / 2
        };
        const end = getEdgePoint(start, toCard);

        return (
          <g key={conn.id}>
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="black"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
              aria-label="RDF connection line"
            />
          </g>
        );
      })}
    </svg>
  );
};

export default RdfConnection;
