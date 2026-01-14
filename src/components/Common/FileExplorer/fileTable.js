// Table view component for displaying files with selection and renaming
import React, { useEffect } from "react";
import FileTypeIcon from "./fileTypeIcon";
import { FiChevronDown } from "react-icons/fi";
import LinearProgress from "@mui/material/LinearProgress";
import CircularProgress from "@mui/material/CircularProgress";
import FileExplorerStyles from "./fileExplorer.module.css";

function FileTable({ sorted, selected, busy, processingFiles = new Set(), fileProgress, nodes = [], onRowMouseDown, onRowMouseUp, onRowMouseLeave, longPressFired, onRowClick, onRowDoubleClick, renamingKey, renameInputRef, renameDraft, setRenameDraft, commitRename, cancelRename, formatBytes, formatDateTime, isNew, onLayoutChange }) {
  const [collapsedNodes, setCollapsedNodes] = React.useState(() => new Set());
  const [nodeHeights, setNodeHeights] = React.useState({});
  const nodeContentRefs = React.useRef(new Map());

  const setNodeRef = (nodeId) => (el) => {
    if (el) nodeContentRefs.current.set(nodeId, el);
    else nodeContentRefs.current.delete(nodeId);
  };

  const toggleNode = (nodeId) => {
    const el = nodeContentRefs.current.get(nodeId);
    const full = el ? el.scrollHeight : 0;
    const isCollapsed = collapsedNodes.has(nodeId);

    const startHeight = isCollapsed ? 0 : full;
    setNodeHeights((prev) => ({ ...prev, [nodeId]: startHeight }));

    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });

    requestAnimationFrame(() => {
      const el2 = nodeContentRefs.current.get(nodeId);
      const nextFull = el2 ? el2.scrollHeight : 0;

      setNodeHeights((prev) => ({
        ...prev,
        [nodeId]: isCollapsed ? nextFull : 0,
      }));

      const delta = isCollapsed ? +nextFull : -full;
      if (onLayoutChange) onLayoutChange(delta);
    });
  };

  useEffect(() => {
    const next = {};
    for (const [nodeId, el] of nodeContentRefs.current.entries())
      next[nodeId] = el.scrollHeight;
    setNodeHeights((prev) => ({ ...prev, ...next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted.length]);

  const fileKey = React.useCallback(
    (f) => `${f?.nodeId || "default"}::${f?.name || ""}`,
    []
  );

  const indexByKey = React.useMemo(() => {
    const m = new Map();
    sorted.forEach((f, i) => m.set(fileKey(f), i));
    return m;
  }, [sorted, fileKey]);

  const filesByNode = React.useMemo(() => {
    if (!nodes || nodes.length <= 1) return null;

    const groups = {};
    sorted.forEach((f) => {
      const nid = f.nodeId || "default";
      if (!groups[nid]) {
        groups[nid] = {
          nodeName: f.nodeName || "Unknown Node",
          files: [],
        };
      }
      groups[nid].files.push(f);
    });

    return groups;
  }, [sorted, nodes]);

  const renderFileRow = (f) => {
    const k = fileKey(f);
    const idx = indexByKey.get(k) ?? 0;
    const isSelected = selected.has(k);
    const isProcessing = processingFiles.has(k);
    const prog = fileProgress?.get(k);
    const showSpinner = isProcessing && (!prog || prog.mode === "spinner");
    const showBar = isProcessing && prog?.mode === "bar";
    const barValue = prog?.value ?? 0;

    return (
      <div
        key={k}
        className={`${FileExplorerStyles.row} ${isSelected ? FileExplorerStyles.rowSelected : ""} ${busy ? FileExplorerStyles.rowDisabled : ""
          } ${isProcessing ? FileExplorerStyles.rowProcessing : ""}`}
        onMouseDown={() => onRowMouseDown(k, idx)}
        onMouseUp={onRowMouseUp}
        onMouseLeave={onRowMouseLeave}
        onClick={(e) => {
          if (longPressFired.current) return;
          onRowClick(e, k, idx);
        }}
        onDoubleClick={() => onRowDoubleClick(k)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !renamingKey) onRowDoubleClick(k);
        }}
        title="Click to select • Long-click for multi • Ctrl/⌘ toggles • Shift range • Double-click opens"
      >
        <div className={FileExplorerStyles.colName}>
          <div className={FileExplorerStyles.fileIconWrap}>
            <FileTypeIcon name={f.name} />
            {showSpinner ? (
              <span className={FileExplorerStyles.iconSpinnerOverlay} title="Processing...">
                <CircularProgress size={18} thickness={4} />
              </span>
            ) : null}
          </div>

          {renamingKey === k ? (
            <input
              ref={renameInputRef}
              className={FileExplorerStyles.renameInline}
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  commitRename();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  cancelRename();
                }
              }}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              onBlur={() => commitRename()}
              disabled={busy}
            />
          ) : showBar ? (
            <div className={FileExplorerStyles.processingProgress}>
              <LinearProgress variant="determinate" value={barValue} />
              <span className={FileExplorerStyles.progressText}>{Math.round(barValue)}%</span>
            </div>
          ) : (
            <span className={FileExplorerStyles.nameText}>
              {f.name}
              {isNew(f) ? <span className={FileExplorerStyles.newMark}> *</span> : null}
            </span>
          )}
        </div>

        <div className={FileExplorerStyles.colSize}>{formatBytes(f.sizeBytes)}</div>
        <div className={FileExplorerStyles.colCreated}>{formatDateTime(f.createdAtMs)}</div>
        <div className={FileExplorerStyles.colModified}>{formatDateTime(f.lastModifiedAtMs)}</div>
      </div>
    );
  };

  return (
    <div className={FileExplorerStyles.table}>
      <div className={FileExplorerStyles.headerRow}>
        <div className={FileExplorerStyles.colName}>Name</div>
        <div className={FileExplorerStyles.colSize}>Size</div>
        <div className={FileExplorerStyles.colCreated}>Created</div>
        <div className={FileExplorerStyles.colModified}>Modified</div>
      </div>

      {filesByNode ? (
        Object.entries(filesByNode).flatMap(([nodeId, group]) => {
          const isCollapsed = collapsedNodes.has(nodeId);

          return [
            <button
              key={`${nodeId}::header`}
              type="button"
              className={FileExplorerStyles.nodeHeaderBtn}
              onClick={() => toggleNode(nodeId)}
              aria-expanded={!isCollapsed}
            >
              <span className={FileExplorerStyles.nodeHeaderText}>Node: {group.nodeName}</span>
              <span
                className={`${FileExplorerStyles.nodeChevron} ${isCollapsed ? FileExplorerStyles.nodeChevronCollapsed : ""
                  }`}
                aria-hidden="true"
              >
                < FiChevronDown />
              </span>
            </button>,

            <div
              key={`${nodeId}::wrap`}
              ref={setNodeRef(nodeId)}
              className={FileExplorerStyles.nodeFilesWrap}
              style={{
                height: isCollapsed ? 0 : nodeHeights[nodeId] ?? "auto",
                opacity: isCollapsed ? 0 : 1,
              }}
            >
              {group.files.map((f) => renderFileRow(f))}
            </div>,
          ];
        })
      ) : (
        sorted.map((f) => renderFileRow(f))
      )}
    </div>
  );
}

export default FileTable;
