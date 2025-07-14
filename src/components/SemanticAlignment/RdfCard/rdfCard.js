import React from "react";
import Close from "@mui/icons-material/Close";
import RdfCardStyles from "./rdf.module.css";

const RdfCard = ({ card, onMouseDown, onTouchStart, onCardClick, onRemoveCard }) => {
  const title = card.elementName || "";
  const subtitle = card.optionLabel || "";

  return (
    <div
      className={RdfCardStyles.card}
      style={{ left: card.x, top: card.y }}
      onMouseDown={(e) => onMouseDown(e, card.id)}
      onTouchStart={(e) => onTouchStart(e, card.id)}
      onClick={(e) => {
        e.stopPropagation();
        onCardClick(card.id);
      }}
    >
      <div
        className={RdfCardStyles.cardClose}
        onClick={(e) => {
          e.stopPropagation();
          onRemoveCard(card.id);
        }}
      >
        <Close sx={{ fontSize: 15 }} />
      </div>
      <div
        className={RdfCardStyles.cardHeader}
        style={{ backgroundColor: card.optionColor || "#007bff" }}
      >
        <h3 className={RdfCardStyles.cardTitle} title={title}>
          {title}
        </h3>
        {subtitle && (
          <h4 className={RdfCardStyles.cardSubtitle} title={subtitle}>
            {subtitle}
          </h4>
        )}
      </div>
    </div>
  );
};

export default RdfCard;
