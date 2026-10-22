import React from "react";
import CloseIcon from "@mui/icons-material/Close";
import { parseTerminology } from "../ColumnSearchList/columnMappingStatus";
import ColumnMappingStyles from "./droppedColumnsList.module.css";

// Component for displaying dropped columns in the drop area
function DroppedColumnsList({ groups, onDeleteGroup, onDrop, height }) {
  const handleDragOver = (e) => e.preventDefault();

  return (
    <div
      className={ColumnMappingStyles.dropArea}
      style={{ height }}
      onDragOver={handleDragOver}
      onDrop={onDrop}
    >
      {groups.length === 0 && (
        <span className={ColumnMappingStyles.dropText}>
          Click or drop columns here
        </span>
      )}
      {groups.map((group, index) => {
        const values = group.values || [];
        const type = values.includes("integer") ? "Integer"
          : values.includes("double") ? "Double"
          : values.includes("date") ? "Date" : "Categorical";
        const annotation = parseTerminology(group.terminology);
        const annotationTitle = annotation.code
          ? `SNOMED CT: ${annotation.label} (${annotation.code})`
          : `Terminology: ${annotation.label}`;

        return (
          <div
            key={`${group.nodeId || ""}::${group.fileName || ""}::${group.column || ""}::${index}`}
            className={ColumnMappingStyles.droppedItem}
            style={{ "--file-accent": group.color || "var(--border-color-secondary)" }}
          >
            <div className={ColumnMappingStyles.groupHeader}>
              <div className={ColumnMappingStyles.groupIdentity}>
                <h4 className={ColumnMappingStyles.groupTitle} title={group.column}>
                  {group.column}
                </h4>
                <div className={ColumnMappingStyles.groupMetadata}>
                  <span className={ColumnMappingStyles.groupType}>{type}</span>
                  <span aria-hidden="true">&middot;</span>
                  <span className={ColumnMappingStyles.groupFile} title={group.fileName}>
                    {group.fileName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className={ColumnMappingStyles.deleteButton}
                onClick={() => onDeleteGroup(group)}
                aria-label={`Remove ${group.column} from mapping`}
                title={`Remove ${group.column}`}
              >
                <CloseIcon fontSize="small" />
              </button>
            </div>

            {annotation.label && (
              <span
                className={ColumnMappingStyles.annotationBadge}
                title={annotationTitle}
                aria-label={annotationTitle}
              >
                <strong>{annotation.code ? "SCT" : "Term"}</strong>
                <span className={ColumnMappingStyles.annotationText}>{annotation.label}</span>
              </span>
            )}

            {type === "Categorical" && values.length > 0 && (
              <div className={ColumnMappingStyles.groupContent}>
                <span className={ColumnMappingStyles.groupDetail}>Categories</span>
                <ul className={ColumnMappingStyles.categoryList}>
                  {values.map((value, valueIndex) => (
                    <li key={valueIndex} className={ColumnMappingStyles.categoryItem}>{value}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default React.memo(DroppedColumnsList);
