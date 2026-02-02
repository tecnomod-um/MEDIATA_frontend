import React from "react";
import IconButton from "@mui/material/IconButton";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FileExplorerStyles from "./fileExplorer.module.css";

function FileToolbar({ toolbarDisabled, doOpenSelected, hasSelection, onOpenFile, onFilesSelected, onFilesOpened, renamingName, selectedCount, startRename, openCleanPanel, requestDelete, multiMode, setMultiMode, busy, load, onClose, onBack, category }) {
  const hasOpenHandler = Boolean(onOpenFile || onFilesSelected || onFilesOpened);

  return (
    <div className={FileExplorerStyles.toolbar}>
      <div className={FileExplorerStyles.toolbarGroup}>
        {onBack ? (
          <IconButton
            className={FileExplorerStyles.backIconBtn}
            onClick={onBack}
            disabled={busy || toolbarDisabled}
            aria-label="Back to nodes"
            title="Back to nodes"
            size="small"
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        ) : null}

        <button
          className={FileExplorerStyles.tbBtn}
          onClick={doOpenSelected}
          disabled={toolbarDisabled || !hasSelection || !hasOpenHandler || !!renamingName}
          title="Open (Enter / double-click)"
        >
          Open
        </button>

        <button
          className={FileExplorerStyles.tbBtn}
          onClick={startRename}
          disabled={toolbarDisabled || selectedCount !== 1}
          title="Rename file (F2)"
        >
          Rename file
        </button>
        {category === "DATASETS" ? (
          <button
            className={FileExplorerStyles.tbBtn}
            onClick={openCleanPanel}
            disabled={toolbarDisabled || !hasSelection}
            title="Data cleaning"
          >
            Data cleaning
          </button>
        ) : null}
        <button
          className={`${FileExplorerStyles.tbBtn} ${FileExplorerStyles.tbDanger}`}
          onClick={requestDelete}
          disabled={toolbarDisabled || !hasSelection}
          title="Delete (Del)"
        >
          Delete
        </button>

        <span className={FileExplorerStyles.toolbarMeta}>
          {multiMode ? (
            <button
              className={FileExplorerStyles.pillBtn}
              type="button"
              onClick={() => setMultiMode(false)}
              disabled={busy}
              title="Exit multi-select mode"
            >
              Selecting multiple files
            </button>
          ) : null}
        </span>
      </div>

      <div className={FileExplorerStyles.toolbarGroup}>
        <IconButton
          className={FileExplorerStyles.refreshIconBtn}
          onClick={load}
          disabled={toolbarDisabled}
          aria-label="Refresh"
          title="Refresh"
          size="small"
        >
          <RefreshIcon fontSize="small" />
        </IconButton>

        {onClose ? (
          <button className={FileExplorerStyles.tbBtn} onClick={onClose} disabled={busy} title="Close">
            Close
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default FileToolbar;
