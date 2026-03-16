// Visual connector component (unused)
import React, { useState } from "react";
import VisualConnectorStyles from "./visualConnector.module.css";

const VisualConnector = ({ data }) => {
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [connections, setConnections] = useState([]);

  const handleEntryClick = (index) => {
    if (selectedEntries.length === 1 && selectedEntries[0] !== index) {
      setConnections([...connections, { from: selectedEntries[0], to: index }]);
      setSelectedEntries([]);
    } else setSelectedEntries([index]);
  };

  return (
    <div className={VisualConnectorStyles.visualizerContainer}>
      <div className={VisualConnectorStyles.entriesContainer}>
        {data.map((entry, index) => (
          <div
            key={index}
            className={`${VisualConnectorStyles.entry} ${
              selectedEntries.includes(index)
                ? VisualConnectorStyles.selected
                : ""
            }`}
            onClick={() => handleEntryClick(index)}
          >
            {entry.name}
          </div>
        ))}
      </div>
      <svg className={VisualConnectorStyles.svgContainer}>
        {connections.map((connection, index) => {
          const from = document.getElementById(`entry-${connection.from}`);
          const to = document.getElementById(`entry-${connection.to}`);
          if (!from || !to) return null;
          const fromRect = from.getBoundingClientRect();
          const toRect = to.getBoundingClientRect();
          const fromX = fromRect.left + fromRect.width / 2;
          const fromY = fromRect.top + fromRect.height / 2;
          const toX = toRect.left + toRect.width / 2;
          const toY = toRect.top + toRect.height / 2;
          return (
            <line
              key={index}
              x1={fromX}
              y1={fromY}
              x2={toX}
              y2={toY}
              className={VisualConnectorStyles.connectionLine}
            />
          );
        })}
      </svg>
    </div>
  );
};

export default VisualConnector;
