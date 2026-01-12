import React from "react";
import IconButton from "@mui/material/IconButton";
import RefreshIcon from "@mui/icons-material/Refresh";
import Styles from "../fileExplorer.module.css";

/**
 * Toolbar - The top action bar for the FileExplorer
 * @param {boolean} toolbarDisabled - Whether the toolbar actions are disabled
 * @param {function} doOpenSelected - Handler to open selected file(s)
 * @param {boolean} hasSelection - Whether any files are selected
 * @param {function} onOpenFile - Callback when a file is opened
 * @param {string} renamingName - Name of the file currently being renamed
 * @param {number} selectedCount - Number of selected files
 * @param {function} startRename - Handler to start renaming
 * @param {function} openCleanPanel - Handler to open the cleaning panel
 * @param {function} requestDelete - Handler to request file deletion
 * @param {boolean} multiMode - Whether multi-select mode is active
 * @param {function} setMultiMode - Handler to toggle multi-select mode
 * @param {boolean} busy - Whether an operation is in progress
 * @param {function} load - Handler to refresh the file list
 * @param {function} onClose - Optional callback to close the explorer
 */
function Toolbar({
  toolbarDisabled,
  doOpenSelected,
  hasSelection,
  onOpenFile,
  renamingName,
  selectedCount,
  startRename,
  openCleanPanel,
  requestDelete,
  multiMode,
  setMultiMode,
  busy,
  load,
  onClose,
}) {
  return (
    <div className={Styles.toolbar}>
      {/* left: action buttons */}
      <div className={Styles.toolbarGroup}>
        <button
          className={Styles.tbBtn}
          onClick={doOpenSelected}
          disabled={toolbarDisabled || !hasSelection || !onOpenFile || !!renamingName}
          title="Open (Enter / double-click)"
        >
          Open
        </button>

        <button
          className={Styles.tbBtn}
          onClick={startRename}
          disabled={toolbarDisabled || selectedCount !== 1}
          title="Rename (F2)"
        >
          Rename
        </button>

        <button
          className={Styles.tbBtn}
          onClick={openCleanPanel}
          disabled={toolbarDisabled || !hasSelection}
          title="Data cleaning"
        >
          Data cleaning
        </button>

        <button
          className={`${Styles.tbBtn} ${Styles.tbDanger}`}
          onClick={requestDelete}
          disabled={toolbarDisabled || !hasSelection}
          title="Delete (Del)"
        >
          Delete
        </button>

        <span className={Styles.toolbarMeta}>
          <span className={Styles.selPill} title="Selected">
            {selectedCount} selected
          </span>
          {multiMode ? (
            <button
              className={Styles.pillBtn}
              type="button"
              onClick={() => setMultiMode(false)}
              disabled={busy}
              title="Exit multi-select mode"
            >
              Multi
            </button>
          ) : null}
        </span>
      </div>

      {/* right: refresh icon + optional close */}
      <div className={Styles.toolbarGroup}>
        <IconButton
          className={Styles.refreshIconBtn}
          onClick={load}
          disabled={toolbarDisabled}
          aria-label="Refresh"
          title="Refresh"
          size="small"
        >
          <RefreshIcon fontSize="small" />
        </IconButton>

        {onClose ? (
          <button className={Styles.tbBtn} onClick={onClose} disabled={busy} title="Close">
            Close
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default Toolbar;
