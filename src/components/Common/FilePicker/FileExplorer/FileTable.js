import React from "react";
import FileTypeIcon from "./FileTypeIcon";
import LinearProgress from "@mui/material/LinearProgress";
import CircularProgress from "@mui/material/CircularProgress";
import Styles from "../fileExplorer.module.css";

/**
 * FileTable - Table displaying the list of files with inline editing and loading indicators
 * @param {array} sorted - Sorted array of files to display
 * @param {Set} selected - Set of selected file names
 * @param {boolean} busy - Whether an operation is in progress
 * @param {Set} processingFiles - Set of file names currently being processed
 * @param {array} nodes - Array of node objects (for multi-node display)
 * @param {function} onRowMouseDown - Handler for row mouse down (long press)
 * @param {function} onRowMouseUp - Handler for row mouse up
 * @param {function} onRowMouseLeave - Handler for row mouse leave
 * @param {object} longPressFired - Ref tracking if long press was fired
 * @param {function} onRowClick - Handler for row click
 * @param {function} onRowDoubleClick - Handler for row double click
 * @param {string} renamingName - Name of file currently being renamed
 * @param {object} renameInputRef - Ref for rename input element
 * @param {string} renameDraft - Draft text for rename input
 * @param {function} setRenameDraft - Handler to update rename draft
 * @param {function} commitRename - Handler to commit rename
 * @param {function} cancelRename - Handler to cancel rename
 * @param {function} formatBytes - Utility to format bytes to human-readable
 * @param {function} formatDateTime - Utility to format timestamp to date/time
 * @param {function} isNew - Check if file is newly created
 */
function FileTable({
  sorted,
  selected,
  busy,
  processingFiles = new Set(),
  progressMode = "spinner",
  progressValue = 0,
  nodes = [],
  onRowMouseDown,
  onRowMouseUp,
  onRowMouseLeave,
  longPressFired,
  onRowClick,
  onRowDoubleClick,
  renamingName,
  renameInputRef,
  renameDraft,
  setRenameDraft,
  commitRename,
  cancelRename,
  formatBytes,
  formatDateTime,
  isNew,
}) {
  // Group files by node when multiple nodes present
  const filesByNode = React.useMemo(() => {
    if (!nodes || nodes.length <= 1) {
      console.log('[FileTable] Single node mode - no grouping');
      return null;
    }
    
    const groups = {};
    sorted.forEach(f => {
      const nid = f.nodeId || 'default';
      if (!groups[nid]) {
        groups[nid] = {
          nodeName: f.nodeName || 'Unknown Node',
          files: []
        };
      }
      groups[nid].files.push(f);
    });
    
    console.log('[FileTable] Multi-node mode - grouped files:', Object.keys(groups).map(nid => ({
      nodeId: nid,
      nodeName: groups[nid].nodeName,
      fileCount: groups[nid].files.length
    })));
    
    return groups;
  }, [sorted, nodes]);

  const renderFileRow = (f, idx) => {
    const isSelected = selected.has(f.name);
    const isProcessing = processingFiles.has(f.name);

    return (
      <div
        key={f.name}
        className={`${Styles.row} ${isSelected ? Styles.rowSelected : ""} ${
          busy ? Styles.rowDisabled : ""
        } ${isProcessing ? Styles.rowProcessing : ""}`}
        onMouseDown={() => onRowMouseDown(f.name, idx)}
        onMouseUp={onRowMouseUp}
        onMouseLeave={onRowMouseLeave}
        onClick={(e) => {
          // if long press already fired, avoid immediately flipping selection again
          if (longPressFired.current) return;
          onRowClick(e, f.name, idx);
        }}
        onDoubleClick={() => onRowDoubleClick(f.name)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          // Enter while focused on row should open ONLY if not renaming
          if (e.key === "Enter" && !renamingName) onRowDoubleClick(f.name);
        }}
        title="Click to select • Long-click for multi • Ctrl/⌘ toggles • Shift range • Double-click opens"
      >
        <div className={Styles.colName}>
          {/* Show spinner in place of icon when processing */}
          {isProcessing ? (
            <span className={Styles.processingSpinner} title="Processing..." aria-label="Processing file">
              <CircularProgress size={22} thickness={4} />
            </span>
          ) : (
            <FileTypeIcon name={f.name} />
          )}

          {renamingName === f.name ? (
            <input
              ref={renameInputRef}
              className={Styles.renameInline}
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
          ) : isProcessing && progressMode === "bar" ? (
            /* Show determinate progress bar with percentage for async operations */
            <div className={Styles.processingProgress}>
              <LinearProgress variant="determinate" value={progressValue} />
              <span className={Styles.progressText}>{Math.round(progressValue)}%</span>
            </div>
          ) : isProcessing && progressMode === "spinner" ? (
            /* Show indeterminate progress bar for sync operations */
            <div className={Styles.processingProgress}>
              <LinearProgress variant="indeterminate" />
            </div>
          ) : (
            <span className={Styles.nameText}>
              {f.name}
              {isNew(f) ? <span className={Styles.newMark}> *</span> : null}
            </span>
          )}
        </div>

        <div className={Styles.colSize}>{formatBytes(f.sizeBytes)}</div>
        <div className={Styles.colCreated}>{formatDateTime(f.createdAtMs)}</div>
        <div className={Styles.colModified}>{formatDateTime(f.lastModifiedAtMs)}</div>
      </div>
    );
  };
  return (
    <div className={Styles.table}>
      <div className={Styles.headerRow}>
        <div className={Styles.colName}>Name</div>
        <div className={Styles.colSize}>Size</div>
        <div className={Styles.colCreated}>Created</div>
        <div className={Styles.colModified}>Modified</div>
      </div>

      {filesByNode ? (
        /* Multi-node mode: group files by node with headers */
        Object.entries(filesByNode).map(([nodeId, group]) => (
          <React.Fragment key={nodeId}>
            <div className={Styles.nodeHeader}>
              <div className={Styles.nodeHeaderText}>Node: {group.nodeName}</div>
            </div>
            {group.files.map((f, idx) => renderFileRow(f, idx))}
          </React.Fragment>
        ))
      ) : (
        /* Single node mode: flat list */
        sorted.map((f, idx) => renderFileRow(f, idx))
      )}
    </div>
  );
}

export default FileTable;
