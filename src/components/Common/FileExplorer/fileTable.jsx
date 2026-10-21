import React, { useEffect } from "react";
import FileTypeIcon from "./fileTypeIcon";
import { FiChevronDown } from "react-icons/fi";
import LinearProgress from "@mui/material/LinearProgress";
import CircularProgress from "@mui/material/CircularProgress";
import FileExplorerStyles from "./fileExplorer.module.css";

const FileRow = React.memo(function FileRow({
  file,
  fileKey,
  index,
  isSelected,
  busy,
  isProcessing,
  progress,
  relatedInfo,
  isRenaming,
  renameInputRef,
  renameDraft,
  handlers,
  formatBytes,
  formatDateTime,
  isNew,
}) {
  const showSpinner = isProcessing && (!progress || progress.mode === "spinner");
  const showBar = isProcessing && progress?.mode === "bar";
  const barValue = progress?.value ?? 0;

  return (
    <div
      className={`${FileExplorerStyles.row} ${isSelected ? FileExplorerStyles.rowSelected : ""} ${busy ? FileExplorerStyles.rowDisabled : ""
        } ${isProcessing ? FileExplorerStyles.rowProcessing : ""}`}
      onMouseDown={() => handlers.mouseDown(fileKey, index)}
      onMouseUp={handlers.mouseUp}
      onMouseLeave={handlers.mouseLeave}
      onClick={(event) => {
        if (handlers.longPressFired.current) return;
        handlers.click(event, fileKey, index);
      }}
      onDoubleClick={() => handlers.doubleClick(fileKey)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !isRenaming) handlers.doubleClick(fileKey);
      }}
      title={relatedInfo?.title || "Click to select • Long-click for multi • Ctrl/⌘ toggles • Shift range • Double-click opens"}
    >
      {relatedInfo ? (
        <span
          className={FileExplorerStyles.relatedStripe}
          style={{ backgroundColor: relatedInfo.color }}
          aria-hidden="true"
        />
      ) : null}

      <div className={FileExplorerStyles.colName}>
        <div className={FileExplorerStyles.fileIconWrap}>
          <FileTypeIcon name={file.name} />
          {showSpinner ? (
            <span className={FileExplorerStyles.iconSpinnerOverlay} title="Processing...">
              <CircularProgress size={18} thickness={4} />
            </span>
          ) : null}
        </div>

        {isRenaming ? (
          <input
            ref={renameInputRef}
            className={FileExplorerStyles.renameInline}
            value={renameDraft}
            onChange={(event) => handlers.renameDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                handlers.commitRename();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                handlers.cancelRename();
              }
            }}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onBlur={handlers.commitRename}
            disabled={busy}
          />
        ) : showBar ? (
          <div className={FileExplorerStyles.processingProgress}>
            <LinearProgress variant="determinate" value={barValue} />
            <span className={FileExplorerStyles.progressText}>{Math.round(barValue)}%</span>
          </div>
        ) : (
          <div className={FileExplorerStyles.nameCell}>
            {relatedInfo ? (
              <span
                className={FileExplorerStyles.relatedBadge}
                style={{ "--related-badge-color": relatedInfo.color }}
              >
                {relatedInfo.groupId}
              </span>
            ) : null}
            <span className={FileExplorerStyles.nameText}>
              {file.name}
              {isNew(file) ? <span className={FileExplorerStyles.newMark}> *</span> : null}
            </span>
          </div>
        )}
      </div>

      <div className={FileExplorerStyles.colSize}>{formatBytes(file.sizeBytes)}</div>
      <div className={FileExplorerStyles.colCreated}>{formatDateTime(file.createdAtMs)}</div>
      <div className={FileExplorerStyles.colModified}>{formatDateTime(file.lastModifiedAtMs)}</div>
    </div>
  );
});

// Files detected will be displayed as rows here. Allows selection and renaming
function FileTable({
  sorted,
  selected,
  busy,
  processingFiles = new Set(),
  fileProgress,
  nodes = [],
  onRowMouseDown,
  onRowMouseUp,
  onRowMouseLeave,
  longPressFired,
  onRowClick,
  onRowDoubleClick,
  renamingKey,
  renameInputRef,
  renameDraft,
  setRenameDraft,
  commitRename,
  cancelRename,
  formatBytes,
  formatDateTime,
  isNew,
  onLayoutChange,
  relatedMode = false,
  relatedInfoByKey = new Map(),
}) {
  const [collapsedNodes, setCollapsedNodes] = React.useState(() => new Set());
  const [nodeHeights, setNodeHeights] = React.useState({});
  const nodeContentRefs = React.useRef(new Map());
  const latestHandlers = React.useRef({});

  latestHandlers.current = {
    onRowMouseDown,
    onRowMouseUp,
    onRowMouseLeave,
    onRowClick,
    onRowDoubleClick,
    setRenameDraft,
    commitRename,
    cancelRename,
  };

  const rowHandlers = React.useMemo(() => ({
    mouseDown: (...args) => latestHandlers.current.onRowMouseDown(...args),
    mouseUp: (...args) => latestHandlers.current.onRowMouseUp(...args),
    mouseLeave: (...args) => latestHandlers.current.onRowMouseLeave(...args),
    click: (...args) => latestHandlers.current.onRowClick(...args),
    doubleClick: (...args) => latestHandlers.current.onRowDoubleClick(...args),
    renameDraft: (...args) => latestHandlers.current.setRenameDraft(...args),
    commitRename: (...args) => latestHandlers.current.commitRename(...args),
    cancelRename: (...args) => latestHandlers.current.cancelRename(...args),
    longPressFired,
  }), [longPressFired]);

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

  const fileKey = React.useCallback(
    (f) => `${f?.nodeId || "default"}::${f?.name || ""}`,
    []
  );

  const displaySorted = React.useMemo(() => {
    if (!relatedMode || !relatedInfoByKey?.size) return sorted;

    return [...sorted].sort((left, right) => {
      const leftInfo = relatedInfoByKey.get(fileKey(left));
      const rightInfo = relatedInfoByKey.get(fileKey(right));

      if (leftInfo && rightInfo) {
        if (leftInfo.groupOrder !== rightInfo.groupOrder) {
          return leftInfo.groupOrder - rightInfo.groupOrder;
        }
      } else if (leftInfo || rightInfo) {
        return leftInfo ? -1 : 1;
      }

      const leftNode = String(left.nodeName || left.nodeId || "");
      const rightNode = String(right.nodeName || right.nodeId || "");
      const nodeCompare = leftNode.localeCompare(rightNode, undefined, { sensitivity: "base" });
      if (nodeCompare !== 0) return nodeCompare;

      return String(left.name).localeCompare(String(right.name), undefined, { sensitivity: "base" });
    });
  }, [sorted, relatedMode, relatedInfoByKey, fileKey]);

  useEffect(() => {
    const next = {};
    for (const [nodeId, el] of nodeContentRefs.current.entries()) {
      next[nodeId] = el.scrollHeight;
    }
    setNodeHeights((prev) => ({ ...prev, ...next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displaySorted.length, relatedMode]);

  const indexByKey = React.useMemo(() => {
    const m = new Map();
    displaySorted.forEach((f, i) => m.set(fileKey(f), i));
    return m;
  }, [displaySorted, fileKey]);

  const filesByNode = React.useMemo(() => {
    if (!nodes || nodes.length <= 1) return null;

    const groups = {};
    displaySorted.forEach((f) => {
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
  }, [displaySorted, nodes]);

  const renderFileRow = (f) => {
    const k = fileKey(f);
    const idx = indexByKey.get(k) ?? 0;
    const isSelected = selected.has(k);
    const isProcessing = processingFiles.has(k);
    const relatedInfo = relatedInfoByKey.get(k);

    return (
      <FileRow
        key={k}
        file={f}
        fileKey={k}
        index={idx}
        isSelected={isSelected}
        busy={busy}
        isProcessing={isProcessing}
        progress={fileProgress?.get(k)}
        relatedInfo={relatedInfo}
        isRenaming={renamingKey === k}
        renameInputRef={renameInputRef}
        renameDraft={renamingKey === k ? renameDraft : ""}
        handlers={rowHandlers}
        formatBytes={formatBytes}
        formatDateTime={formatDateTime}
        isNew={isNew}
      />
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
        displaySorted.map((f) => renderFileRow(f))
      )}

    </div>
  );
}

export default FileTable;
