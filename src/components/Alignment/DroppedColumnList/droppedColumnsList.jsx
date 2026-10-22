import React from "react";
import CloseIcon from "@mui/icons-material/Close";
import { parseTerminology } from "../ColumnSearchList/columnMappingStatus";
import ColumnMappingStyles from "./droppedColumnsList.module.css";

const boundValue = (values, prefix) =>
  values.find((value) => typeof value === "string" && value.startsWith(prefix))
    ?.slice(prefix.length).trim();

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
        const lower = type === "Date" ? boundValue(values, "earliest:") : boundValue(values, "min:");
        const upper = type === "Date" ? boundValue(values, "latest:") : boundValue(values, "max:");
        const rangeLabel = lower && upper ? "Range" : lower ? "Minimum" : "Maximum";
        const rangeText = lower && upper ? `${lower}\u2013${upper}` : lower || upper;
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
              </div>
              <div className={ColumnMappingStyles.groupMetadata}>
                <span className={ColumnMappingStyles.groupType}>
                  <span className={ColumnMappingStyles.typePrefix}>Type: </span>
                  <span>{type}</span>
                </span>
                <span className={ColumnMappingStyles.groupFile} title={group.fileName}>
                  <span className={ColumnMappingStyles.filePrefix}>from </span>
                  <em>{group.fileName}</em>
                </span>
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
            {type !== "Categorical" && rangeText && (
              <div className={ColumnMappingStyles.groupContent}>
                <span className={ColumnMappingStyles.groupDetail}>{rangeLabel}</span>
                <span className={ColumnMappingStyles.rangeValue} title={`${rangeLabel}: ${rangeText}`}>
                  {rangeText}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default React.memo(DroppedColumnsList);
