import React, { useMemo, useState, useCallback, useRef } from "react";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import SnomedAnnotationPopover from "./snomedAnnotationPopover";
import {
  columnReferenceKey,
  getColumnMappingStatuses,
  inferColumnType,
  parseTerminology,
} from "./columnMappingStatus";
import ColumnSearchListStyles from "./columnSearchList.module.css";

const SourceColumnItem = React.memo(function SourceColumnItem({
  column,
  mappingStatus,
  isAnnotationOpen,
  onAnnotationOpen,
  onAnnotationClose,
  onTerminologyChange,
  handleColumnClick,
  handleDragStart,
}) {
  const annotationButtonRef = useRef(null);
  const primaryAnnotation = parseTerminology(column.terminology);
  const isAnnotated = Boolean(primaryAnnotation.label);
  const hasSctid = Boolean(primaryAnnotation.code);
  const hasCustomMapping = mappingStatus === "Custom";
  const itemClassName = [
    ColumnSearchListStyles.columnItem,
    isAnnotated ? ColumnSearchListStyles.columnItemAnnotated : "",
    hasCustomMapping ? ColumnSearchListStyles.columnItemCustom : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={itemClassName}
      draggable
      onDragStart={(event) => handleDragStart(event, column)}
      role="listitem"
      data-column-key={columnReferenceKey(column)}
      style={{ "--file-accent": column.color || "transparent" }}
    >
      <button
        type="button"
        className={ColumnSearchListStyles.columnMain}
        onClick={() => handleColumnClick(column)}
        title={`${column.fileName || "Source"} - ${column.column}`}
      >
        <span className={ColumnSearchListStyles.columnName}>{column.column}</span>
        <span className={ColumnSearchListStyles.columnMetaRow}>
          {primaryAnnotation.label ? (
            <span
              className={ColumnSearchListStyles.snomedBadge}
              title={hasSctid
                ? `SNOMED CT: ${primaryAnnotation.label} (${primaryAnnotation.code})`
                : `Terminology: ${primaryAnnotation.label}`}
              aria-label={`${hasSctid ? "SNOMED CT" : "Terminology"} annotated: ${primaryAnnotation.label}`}
            >
              <b className={ColumnSearchListStyles.snomedPrefix}>{hasSctid ? "SCT" : "Term"}</b>
              <span className={ColumnSearchListStyles.snomedText}>{primaryAnnotation.label}</span>
              <CheckIcon className={ColumnSearchListStyles.compactSnomedStatus} aria-hidden="true" />
            </span>
          ) : (
            <span className={ColumnSearchListStyles.pendingBadge} aria-label="SNOMED CT not annotated" title="SNOMED CT: Not annotated">
              <b className={ColumnSearchListStyles.snomedPrefix}>SCT</b>
              <span className={ColumnSearchListStyles.snomedText}>Not annotated</span>
              <CloseIcon className={ColumnSearchListStyles.compactSnomedStatus} aria-hidden="true" />
            </span>
          )}
          <span className={`${ColumnSearchListStyles.mappingBadge} ${hasCustomMapping ? ColumnSearchListStyles.customBadge : ""}`}>
            {mappingStatus}
          </span>
        </span>
      </button>

      <div className={ColumnSearchListStyles.columnActions}>
        <span className={ColumnSearchListStyles.columnType}>{inferColumnType(column)}</span>
        <button
          ref={annotationButtonRef}
          type="button"
          className={ColumnSearchListStyles.annotationButton}
          onClick={(event) => {
            event.stopPropagation();
            onAnnotationOpen(columnReferenceKey(column));
          }}
          aria-label={`Annotate ${column.column} with SNOMED CT`}
          title="Add or edit SNOMED CT annotation"
        >
          <LocalOfferOutlinedIcon />
        </button>
      </div>

      {isAnnotationOpen && (
        <SnomedAnnotationPopover
          anchorElement={annotationButtonRef.current}
          column={column}
          onChange={(terminology) => onTerminologyChange(column, terminology)}
          onClose={onAnnotationClose}
        />
      )}
    </div>
  );
});

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

  const columnStates = useMemo(() => getColumnMappingStatuses(mappings), [mappings]);

  const counts = useMemo(() => {
    const annotated = columnsData.filter((column) =>
      Boolean(String(column?.terminology || "").trim())
    ).length;
    const mapped = columnsData.filter((column) =>
      columnStates.has(columnReferenceKey(column))
    ).length;
    return { total: columnsData.length, annotated, mapped };
  }, [columnsData, columnStates]);

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
  const openAnnotation = useCallback((columnKey) => setAnnotationColumnKey(columnKey), []);
  const closeAnnotation = useCallback(() => setAnnotationColumnKey(null), []);
  const openAll = useCallback(() => setCollapsed({}), []);
  const collapseAll = useCallback(() => {
    const next = {};
    for (const group of grouped) next[group.groupKey] = true;
    setCollapsed(next);
  }, [grouped]);

  return (
    <section className={ColumnSearchListStyles.search} aria-label="Source variables">
      <div className={ColumnSearchListStyles.searchToolbar}>
        <input
          className={ColumnSearchListStyles.input}
          type="search"
          placeholder="Search source variables"
          value={searchTerm}
          onChange={handleChange}
          aria-label="Search source variables by name"
          role="searchbox"
        />
        <div className={ColumnSearchListStyles.groupActionsInline}>
          <button type="button" onClick={openAll} className={ColumnSearchListStyles.expandCollapseBtn} aria-label="Expand all column groups" title="Expand all">
            <UnfoldMoreIcon />
          </button>
          <button type="button" onClick={collapseAll} className={ColumnSearchListStyles.expandCollapseBtn} aria-label="Collapse all column groups" title="Collapse all">
            <UnfoldLessIcon />
          </button>
        </div>
      </div>

      <div
        className={ColumnSearchListStyles.scrollableContainer}
        data-snomed-scroll-root
        role="list"
        aria-label="Column groups"
      >
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
                        mappingStatus={columnStates.get(itemKey) || "Unmapped"}
                        isAnnotationOpen={annotationColumnKey === itemKey}
                        onAnnotationOpen={openAnnotation}
                        onAnnotationClose={closeAnnotation}
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

      <div className={ColumnSearchListStyles.summary} aria-label="Source variable status">
        <span title={`${counts.total} source variables`}>
          Total <strong>{counts.total}</strong>
        </span>
        <span title={`${counts.annotated} source variables annotated with SNOMED CT`}>
          Annotated <strong>{counts.annotated}</strong>
        </span>
        <span title={`${counts.mapped} source variables used in mappings`}>
          Mapped <strong>{counts.mapped}</strong>
        </span>
      </div>
    </section>
  );
}

export default React.memo(ColumnSearchList);
