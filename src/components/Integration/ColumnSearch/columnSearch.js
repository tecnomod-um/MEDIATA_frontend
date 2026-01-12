import React, { useMemo, useState, useCallback } from "react";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import ColumnSearchStyles from "./columnSearch.module.css";

function ColumnSearch({ columnsData, handleColumnClick, handleDragStart }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsed, setCollapsed] = useState({});

  const handleChange = (e) => setSearchTerm(e.target.value.toLowerCase());

  // 1) Filter columns by search term
  const filteredColumns = useMemo(() => {
    const term = searchTerm.trim();
    if (!term) return columnsData;

    return columnsData.filter((c) =>
      (c.column ?? "").toLowerCase().includes(term)
    );
  }, [columnsData, searchTerm]);

  // 2) Group by nodeId + fileName (element file)
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
          // use first column's color as the file color (all columns in a file share it in your Integration code)
          fileColor: col.color,
          items: [],
        });
      }
      map.get(groupKey).items.push(col);
    }

    // Optional: sort groups and items for stable UI
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
    <div className={ColumnSearchStyles.search}>
<div className={ColumnSearchStyles.searchRow}>
  <input
    className={ColumnSearchStyles.input}
    type="search"
    placeholder="Search columns"
    onChange={handleChange}
  />

<div className={ColumnSearchStyles.groupActionsInline}>
  <button
    type="button"
    className={ColumnSearchStyles.iconBtn}
    onClick={openAll}
    title="Expand all"
    aria-label="Expand all"
  >
    <UnfoldMoreIcon fontSize="small" />
  </button>

  <button
    type="button"
    className={ColumnSearchStyles.iconBtn}
    onClick={collapseAll}
    title="Collapse all"
    aria-label="Collapse all"
  >
    <UnfoldLessIcon fontSize="small" />
  </button>
</div>

</div>


      <div className={ColumnSearchStyles.scrollableContainer}>
        {grouped.map((group) => {
          const isCollapsed = !!collapsed[group.groupKey];
          return (
            <div key={group.groupKey} className={ColumnSearchStyles.fileGroup}>
              <button
                type="button"
                className={ColumnSearchStyles.fileHeader}
                onClick={() => toggleGroup(group.groupKey)}
                aria-expanded={!isCollapsed}
              >
                <span
                  className={ColumnSearchStyles.fileColorPill}
                  style={{ backgroundColor: group.fileColor || "transparent" }}
                  aria-hidden="true"
                />
                <span className={ColumnSearchStyles.fileTitle} title={group.fileName}>
                  {group.fileName}
                </span>
                <span className={ColumnSearchStyles.fileMeta}>
                  ({group.items.length})
                </span>
                <span className={ColumnSearchStyles.chevron}>
                  {isCollapsed ? "▸" : "▾"}
                </span>
              </button>

              {!isCollapsed && (
                <div className={ColumnSearchStyles.fileItems}>
                  {group.items.map((column) => {
                    const itemKey = `${group.groupKey}::${column.column}`;
                    return (
                      <div
                        key={itemKey}
                        className={ColumnSearchStyles.columnItem}
                        style={{ borderLeftColor: column.color }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, column)}
                        onClick={() => handleColumnClick(column)}
                        title={`${group.fileName} • ${column.column}`}
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
          <div className={ColumnSearchStyles.emptyState}>No columns found.</div>
        )}
      </div>
    </div>
  );
}

export default ColumnSearch;
