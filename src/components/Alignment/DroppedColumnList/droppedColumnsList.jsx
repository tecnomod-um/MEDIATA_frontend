import React, { useEffect, useMemo, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import AddIcon from "@mui/icons-material/Add";
import { columnReferenceKey, parseTerminology } from "../ColumnSearchList/columnMappingStatus";
import { rankSimilarColumns as rankSimilarColumnsApi } from "../../../util/petitionHandler";
import { rankSimilarColumns } from "./similarColumns";
import ColumnMappingStyles from "./droppedColumnsList.module.css";

const boundValue = (values, prefix) =>
  values.find((value) => typeof value === "string" && value.startsWith(prefix))
    ?.slice(prefix.length).trim();

const semanticColumn = ({ nodeId, fileName, column, terminology }) =>
  ({ nodeId, fileName, column, terminology });

// Component for displaying dropped columns in the drop area
function DroppedColumnsList({ groups, sourceColumns = [], onAddGroup, onDeleteGroup, onDrop, height }) {
  const [activeKey, setActiveKey] = useState("");
  const [semanticScores, setSemanticScores] = useState([]);
  const [refining, setRefining] = useState(false);
  const handleDragOver = (e) => e.preventDefault();

  const activeGroup = groups.find((group) => columnReferenceKey(group) === activeKey);
  const activeSource = sourceColumns.find((column) => columnReferenceKey(column) === activeKey) || activeGroup;
  const similar = useMemo(
    () => rankSimilarColumns(activeSource, sourceColumns, groups, semanticScores).slice(0, 6),
    [activeSource, sourceColumns, groups, semanticScores]
  );

  useEffect(() => {
    if (!activeKey || !activeSource || sourceColumns.length < 2) return undefined;
    const controller = new AbortController();
    const candidates = sourceColumns.filter((column) => columnReferenceKey(column) !== activeKey)
      .slice(0, 250).map(semanticColumn);
    setSemanticScores([]);
    setRefining(true);
    rankSimilarColumnsApi({ anchor: semanticColumn(activeSource), candidates, signal: controller.signal })
      .then((scores) => { if (!controller.signal.aborted) setSemanticScores(Array.isArray(scores) ? scores : []); })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setRefining(false); });
    return () => controller.abort();
  }, [activeKey, activeSource, sourceColumns]);

  useEffect(() => {
    if (activeKey && !activeGroup) setActiveKey("");
  }, [activeKey, activeGroup]);

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
              <div className={ColumnMappingStyles.groupActions}>
                {onAddGroup && sourceColumns.length > 1 && (
                  <button
                    type="button"
                    className={ColumnMappingStyles.similarButton}
                    onClick={() => setActiveKey(activeKey === columnReferenceKey(group) ? "" : columnReferenceKey(group))}
                    aria-label={`Find variables similar to ${group.column}`}
                    aria-expanded={activeKey === columnReferenceKey(group)}
                    title="Find similar variables"
                  >
                    <ManageSearchIcon fontSize="small" />
                  </button>
                )}
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
            {activeKey === columnReferenceKey(group) && (
              <div className={ColumnMappingStyles.similarPanel}>
                <div className={ColumnMappingStyles.similarHeading}>
                  <strong>Similar variables</strong>
                  {refining && <span>Refining matches...</span>}
                </div>
                {similar.length ? (
                  <ul className={ColumnMappingStyles.similarList}>
                    {similar.map(({ column, reason }) => (
                      <li key={columnReferenceKey(column)}>
                        <button type="button" onClick={() => onAddGroup(column)}
                          className={ColumnMappingStyles.similarOption}
                          aria-label={`Add ${column.column} from ${column.fileName}`}>
                          <span className={ColumnMappingStyles.similarCopy}>
                            <strong title={column.column}>{column.column}</strong>
                            <small title={column.fileName}>{column.fileName} · {reason}</small>
                          </span>
                          <AddIcon fontSize="small" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : <p className={ColumnMappingStyles.similarEmpty}>
                  {refining ? "Looking for related variables..." : "No related variables found"}
                </p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default React.memo(DroppedColumnsList);
