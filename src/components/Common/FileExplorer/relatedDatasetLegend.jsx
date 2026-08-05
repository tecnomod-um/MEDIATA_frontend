import React from "react";
import { FiInfo } from "react-icons/fi";
import FileExplorerStyles from "./fileExplorer.module.css";

function RelatedDatasetLegend({ groups = [] }) {
  if (!groups.length) return null;

  return (
    <div className={FileExplorerStyles.relatedLegend} role="note" aria-label="Related dataset groups">
      <div className={FileExplorerStyles.relatedLegendGroups}>
        {groups.map((group) => (
          <div key={group.groupId} className={FileExplorerStyles.relatedLegendItem}>
            <span
              className={FileExplorerStyles.relatedLegendDot}
              style={{ backgroundColor: group.color }}
              aria-hidden="true"
            />
            <span className={FileExplorerStyles.relatedLegendLabel}>{group.groupId}</span>
            <span className={FileExplorerStyles.relatedLegendMeta}>
              {group.count} {group.count === 1 ? "dataset" : "datasets"}
            </span>
          </div>
        ))}
      </div>
      <div className={FileExplorerStyles.relatedLegendHint}>
        <FiInfo aria-hidden="true" />
        <span>Groups show datasets related across nodes</span>
      </div>
    </div>
  );
}

export default RelatedDatasetLegend;
