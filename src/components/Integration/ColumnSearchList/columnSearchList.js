import React, { useMemo, useState, useCallback } from "react";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import ColumnSearchListStyles from "./columnSearchList.module.css";

// Column list with search functionality and additional controls
function ColumnSearchList({ columnsData, handleColumnClick, handleDragStart }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsed, setCollapsed] = useState({});

  const handleChange = (e) => setSearchTerm(e.target.value.toLowerCase());

  const filteredColumns = useMemo(() => {
    const term = searchTerm.trim();
    if (!term) return columnsData;

    return columnsData.filter((c) =>
      (c.column ?? "").toLowerCase().includes(term)
    );
  }, [columnsData, searchTerm]);

  const grouped = useMemo(() => {
    const map = new Map();

    for (const col of filteredColumns) {
      const nodeId = col.nodeId ?? "unknown-node";
      const fileName = col.fileName ?? "unknown-file";
      const groupKey = `${nodeId}::${fileName}`;

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          groupKey,
          nodeId,
          fileName,
          fileColor: col.color,
          items: [],
        });
      }
      map.get(groupKey).items.push(col);
    }

    const groups = Array.from(map.values()).sort((a, b) => {
      if (a.nodeId !== b.nodeId) return String(a.nodeId).localeCompare(String(b.nodeId));
      return String(a.fileName).localeCompare(String(b.fileName));
    });

    groups.forEach((g) => {
      g.items.sort((a, b) => String(a.column).localeCompare(String(b.column)));
    });

    return groups;
  }, [filteredColumns]);

  const toggleGroup = useCallback((groupKey) => {
    setCollapsed((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  }, []);

  const openAll = useCallback(() => setCollapsed({}), []);
  const collapseAll = useCallback(() => {
    const next = {};
    for (const g of grouped) next[g.groupKey] = true;
    setCollapsed(next);
  }, [grouped]);

  return (
    <div className={ColumnSearchListStyles.search}>
      <div className={ColumnSearchListStyles.searchRow}>
        <input
          className={ColumnSearchListStyles.input}
          type="search"
          placeholder="Search columns"
          onChange={handleChange}
          aria-label="Search columns by name"
          role="searchbox"
        />

        <div className={ColumnSearchListStyles.groupActionsInline}>
          <button
            type="button"
            onClick={openAll}
            className={ColumnSearchListStyles.expandCollapseBtn}
            aria-label="Expand all column groups"
          >
            <UnfoldMoreIcon />
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className={ColumnSearchListStyles.expandCollapseBtn}
            aria-label="Collapse all column groups"
          >
            <UnfoldLessIcon />
          </button>
        </div>
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
                aria-label={`${group.fileName} - ${group.items.length} column${group.items.length !== 1 ? 's' : ''}`}
                aria-controls={`column-group-${group.groupKey}`}
              >
                <span
                  className={ColumnSearchListStyles.fileColorPill}
                  style={{ backgroundColor: group.fileColor || "transparent" }}
                  aria-hidden="true"
                />
                <span className={ColumnSearchListStyles.fileTitle} title={group.fileName}>
                  {group.fileName}
                </span>
                <span className={ColumnSearchListStyles.fileMeta}>
                  ({group.items.length})
                </span>
                <span className={ColumnSearchListStyles.chevron}>
                  {isCollapsed ? "▸" : "▾"}
                </span>
              </button>

              {!isCollapsed && (
                <div
                  className={ColumnSearchListStyles.fileItems}
                  id={`column-group-${group.groupKey}`}
                  role="list"
                  aria-label={`Columns in ${group.fileName}`}
                >
                  {group.items.map((column) => {
                    const itemKey = `${group.groupKey}::${column.column}`;
                    return (
                      <div
                        key={itemKey}
                        className={ColumnSearchListStyles.columnItem}
                        style={{ borderLeftColor: column.color }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, column)}
                        onClick={() => handleColumnClick(column)}
                        title={`${group.fileName} • ${column.column}`}
                        role="listitem"
                        aria-label={`Column: ${column.column}`}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleColumnClick(column);
                          }
                        }}
                      >
                        {column.column}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {grouped.length === 0 && (
          <div className={ColumnSearchListStyles.emptyState} role="status">No columns found.</div>
        )}
      </div>
    </div>
  );
}

export default ColumnSearchList;
