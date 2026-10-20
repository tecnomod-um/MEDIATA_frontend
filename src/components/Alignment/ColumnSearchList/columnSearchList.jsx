import React, { useMemo, useState, useCallback, useRef } from "react";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import SnomedAnnotationPopover from "./snomedAnnotationPopover";
import {
  columnReferenceKey,
  getColumnMappingTargets,
  inferColumnType,
  parseTerminology,
} from "./columnMappingStatus";
import ColumnSearchListStyles from "./columnSearchList.module.css";

function SourceColumnItem({
  column,
  targets,
  isAnnotationOpen,
  onAnnotationOpen,
  onAnnotationClose,
  onTerminologyChange,
  handleColumnClick,
  handleDragStart,
}) {
  const annotationButtonRef = useRef(null);
  const annotatedTargets = targets.filter((target) => target.terminology);
  const primaryAnnotation = parseTerminology(annotatedTargets[0]?.terminology);
  const hasCustomMapping = targets.some((target) => target.kind === "custom");
  const hasDefaultMapping = targets.some((target) => target.kind === "default");
  const mappingStatus = hasCustomMapping ? "Custom" : hasDefaultMapping ? "Default" : "Unmapped";
  const itemClassName = [
    ColumnSearchListStyles.columnItem,
    annotatedTargets.length ? ColumnSearchListStyles.columnItemAnnotated : "",
    hasCustomMapping ? ColumnSearchListStyles.columnItemCustom : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={itemClassName}
      draggable
      onDragStart={(event) => handleDragStart(event, column)}
      role="listitem"
      data-column-key={columnReferenceKey(column)}
    >
      <button
        type="button"
        className={ColumnSearchListStyles.columnMain}
        onClick={() => handleColumnClick(column)}
        title={`${column.fileName || "Source"} - ${column.column}`}
      >
        <span className={ColumnSearchListStyles.columnTopRow}>
          <strong className={ColumnSearchListStyles.columnName}>{column.column}</strong>
          <span className={ColumnSearchListStyles.columnType}>{inferColumnType(column)}</span>
        </span>
        <span className={ColumnSearchListStyles.columnMetaRow}>
          {primaryAnnotation.label ? (
            <span className={ColumnSearchListStyles.snomedBadge} title={annotatedTargets[0].terminology}>
              <b>SCT</b>
              <span>{primaryAnnotation.label}</span>
              {annotatedTargets.length > 1 && <em>+{annotatedTargets.length - 1}</em>}
            </span>
          ) : (
            <span className={ColumnSearchListStyles.pendingBadge}>
              <b>SCT</b>
              <span>Not annotated</span>
            </span>
          )}
          <span className={`${ColumnSearchListStyles.mappingBadge} ${hasCustomMapping ? ColumnSearchListStyles.customBadge : ""}`}>
            {mappingStatus}
          </span>
        </span>
      </button>

      <button
        ref={annotationButtonRef}
        type="button"
        className={ColumnSearchListStyles.annotationButton}
        onClick={(event) => {
          event.stopPropagation();
          onAnnotationOpen();
        }}
        aria-label={`Annotate ${column.column} with SNOMED CT`}
        title="Add or edit SNOMED CT annotation"
        disabled={!targets.length}
      >
        <LocalOfferOutlinedIcon />
      </button>

      {isAnnotationOpen && (
        <SnomedAnnotationPopover
          anchorElement={annotationButtonRef.current}
          column={column}
          targets={targets}
          onChange={onTerminologyChange}
          onClose={onAnnotationClose}
        />
      )}
    </div>
  );
}

function ColumnSearchList({
  columnsData = [],
  mappings = [],
  onTerminologyChange = () => {},
  handleColumnClick,
  handleDragStart,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const [annotationColumnKey, setAnnotationColumnKey] = useState(null);

  const columnStates = useMemo(() => {
    const states = new Map();
    (columnsData || []).forEach((column) => {
      states.set(columnReferenceKey(column), getColumnMappingTargets(column, mappings));
    });
    return states;
  }, [columnsData, mappings]);

  const counts = useMemo(() => {
    let annotated = 0;
    columnStates.forEach((targets) => {
      if (targets.some((target) => target.terminology)) annotated += 1;
    });
    return { annotated, pending: Math.max(0, columnsData.length - annotated) };
  }, [columnStates, columnsData.length]);

  const handleChange = (event) => setSearchTerm(event.target.value.toLowerCase());

  const filteredColumns = useMemo(() => {
    const term = searchTerm.trim();
    if (!term) return columnsData;
    return columnsData.filter((column) => (column.column ?? "").toLowerCase().includes(term));
  }, [columnsData, searchTerm]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const col of filteredColumns) {
      const nodeId = col.nodeId ?? "unknown-node";
      const fileName = col.fileName ?? "unknown-file";
      const groupKey = `${nodeId}::${fileName}`;
      if (!map.has(groupKey)) {
        map.set(groupKey, { groupKey, nodeId, fileName, fileColor: col.color, items: [] });
      }
      map.get(groupKey).items.push(col);
    }

    const groups = Array.from(map.values()).sort((left, right) => {
      if (left.nodeId !== right.nodeId) return String(left.nodeId).localeCompare(String(right.nodeId));
      return String(left.fileName).localeCompare(String(right.fileName));
    });
    groups.forEach((group) => group.items.sort((left, right) => String(left.column).localeCompare(String(right.column))));
    return groups;
  }, [filteredColumns]);

  const toggleGroup = useCallback((groupKey) => {
    setCollapsed((previous) => ({ ...previous, [groupKey]: !previous[groupKey] }));
  }, []);
  const openAll = useCallback(() => setCollapsed({}), []);
  const collapseAll = useCallback(() => {
    const next = {};
    for (const group of grouped) next[group.groupKey] = true;
    setCollapsed(next);
  }, [grouped]);

  return (
    <section className={ColumnSearchListStyles.search} aria-labelledby="source-variables-title">
      <div className={ColumnSearchListStyles.panelHeader}>
        <h2 id="source-variables-title">Source variables</h2>
        <div className={ColumnSearchListStyles.groupActionsInline}>
          <button type="button" onClick={openAll} className={ColumnSearchListStyles.expandCollapseBtn} aria-label="Expand all column groups" title="Expand all">
            <UnfoldMoreIcon />
          </button>
          <button type="button" onClick={collapseAll} className={ColumnSearchListStyles.expandCollapseBtn} aria-label="Collapse all column groups" title="Collapse all">
            <UnfoldLessIcon />
          </button>
        </div>
      </div>

      <input
        className={ColumnSearchListStyles.input}
        type="search"
        placeholder="Search source variables"
        value={searchTerm}
        onChange={handleChange}
        aria-label="Search columns by name"
        role="searchbox"
      />

      <div className={ColumnSearchListStyles.summary} aria-label="Annotation progress">
        <span className={ColumnSearchListStyles.annotatedSummary}>SNOMED CT annotated · {counts.annotated}</span>
        <span className={ColumnSearchListStyles.pendingSummary}>Pending · {counts.pending}</span>
      </div>

      <div className={ColumnSearchListStyles.scrollableContainer} role="list" aria-label="Column groups">
        {grouped.map((group) => {
          const isCollapsed = !!collapsed[group.groupKey];
          return (
            <div key={group.groupKey} className={ColumnSearchListStyles.fileGroup} role="listitem">
              <button
                type="button"
                className={ColumnSearchListStyles.fileHeader}
                onClick={() => toggleGroup(group.groupKey)}
                aria-expanded={!isCollapsed}
                aria-label={`${group.fileName} - ${group.items.length} column${group.items.length !== 1 ? "s" : ""}`}
                aria-controls={`column-group-${group.groupKey}`}
              >
                <span className={ColumnSearchListStyles.fileColorPill} style={{ backgroundColor: group.fileColor || "transparent" }} aria-hidden="true" />
                <span className={ColumnSearchListStyles.fileTitle} title={group.fileName}>{group.fileName}</span>
                <span className={ColumnSearchListStyles.fileMeta}>({group.items.length})</span>
                <span className={ColumnSearchListStyles.chevron}>{isCollapsed ? "▸" : "▾"}</span>
              </button>

              {!isCollapsed && (
                <div className={ColumnSearchListStyles.fileItems} id={`column-group-${group.groupKey}`} role="list" aria-label={`Columns in ${group.fileName}`}>
                  {group.items.map((column) => {
                    const itemKey = columnReferenceKey(column);
                    return (
                      <SourceColumnItem
                        key={itemKey}
                        column={column}
                        targets={columnStates.get(itemKey) || []}
                        isAnnotationOpen={annotationColumnKey === itemKey}
                        onAnnotationOpen={() => setAnnotationColumnKey(itemKey)}
                        onAnnotationClose={() => setAnnotationColumnKey(null)}
                        onTerminologyChange={onTerminologyChange}
                        handleColumnClick={handleColumnClick}
                        handleDragStart={handleDragStart}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {grouped.length === 0 && <div className={ColumnSearchListStyles.emptyState} role="status">No columns found.</div>}
      </div>
    </section>
  );
}

export default ColumnSearchList;
