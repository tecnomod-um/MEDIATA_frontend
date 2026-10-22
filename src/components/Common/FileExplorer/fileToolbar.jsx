import React from "react";
import IconButton from "@mui/material/IconButton";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import CleaningServicesOutlinedIcon from "@mui/icons-material/CleaningServicesOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import CloseIcon from "@mui/icons-material/Close";
import FileExplorerStyles from "./fileExplorer.module.css";

function FileToolbar({
  toolbarDisabled,
  doOpenSelected,
  hasSelection,
  onOpenFile,
  onFilesSelected,
  onFilesOpened,
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
  onBack,
  category,
  canShowRelated = false,
  relatedMode = false,
  relatedBusy = false,
  onToggleRelated,
}) {
  const hasOpenHandler = Boolean(onOpenFile || onFilesSelected || onFilesOpened);
  const renderButtonContent = (IconComponent, label) => (
    <span className={FileExplorerStyles.tbBtnContent}>
      <IconComponent className={FileExplorerStyles.tbBtnIcon} fontSize="small" aria-hidden="true" />
      <span className={FileExplorerStyles.tbBtnText}>{label}</span>
    </span>
  );

  return (
    <div className={FileExplorerStyles.toolbar}>
      <div className={`${FileExplorerStyles.toolbarGroup} ${FileExplorerStyles.toolbarGroupPrimary}`}>
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
          aria-label="Open"
          title="Open (Enter / double-click)"
        >
          {renderButtonContent(OpenInNewIcon, "Open")}
        </button>

        <button
          className={FileExplorerStyles.tbBtn}
          onClick={startRename}
          disabled={toolbarDisabled || selectedCount !== 1}
          aria-label="Rename file"
          title="Rename file (F2)"
        >
          {renderButtonContent(DriveFileRenameOutlineIcon, "Rename file")}
        </button>
        {category === "DATASETS" ? (
          <button
            className={FileExplorerStyles.tbBtn}
            onClick={openCleanPanel}
            disabled={toolbarDisabled || !hasSelection}
            aria-label="Data cleaning"
            title="Data cleaning"
          >
            {renderButtonContent(CleaningServicesOutlinedIcon, "Data cleaning")}
          </button>
        ) : null}
        <button
          className={`${FileExplorerStyles.tbBtn} ${FileExplorerStyles.tbDanger}`}
          onClick={requestDelete}
          disabled={toolbarDisabled || !hasSelection}
          aria-label="Delete"
          title="Delete (Del)"
        >
          {renderButtonContent(DeleteOutlineIcon, "Delete")}
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

      <div className={`${FileExplorerStyles.toolbarGroup} ${FileExplorerStyles.toolbarGroupSecondary}`}>
        {canShowRelated ? (
          <button
            className={`${FileExplorerStyles.tbBtn} ${relatedMode ? FileExplorerStyles.tbBtnActive : ""}`}
            onClick={onToggleRelated}
            disabled={toolbarDisabled || relatedBusy}
            aria-label="Related datasets"
            title="Group files that likely describe the same information"
          >
            {renderButtonContent(HubOutlinedIcon, relatedBusy ? "Checking..." : "Related datasets")}
          </button>
        ) : null}

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
          <button
            className={FileExplorerStyles.tbBtn}
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            title="Close"
          >
            {renderButtonContent(CloseIcon, "Close")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default React.memo(FileToolbar);
