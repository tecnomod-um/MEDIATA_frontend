// Delete confirmation modal for file removal
import React from "react";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import FileExplorerStyles from "./fileExplorer.module.css";

function DeleteConfirmation({ show, selectedCount, onCancel, onConfirm, busy }) {
  if (!show) return null;

  return (
    <div
      className={FileExplorerStyles.confirmOverlay}
      onMouseDown={() => !busy && onCancel()}
      role="presentation"
    >
      <div
        className={FileExplorerStyles.confirmCard}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Delete confirmation"
      >
        <IconButton
          className={FileExplorerStyles.confirmCloseIcon}
          onClick={onCancel}
          disabled={busy}
          aria-label="Close"
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <div className={FileExplorerStyles.confirmHeader}>
          <div className={FileExplorerStyles.confirmTitle}>Delete</div>
          <div className={FileExplorerStyles.confirmText}>
            Delete {selectedCount} file{selectedCount === 1 ? "" : "s"}?
          </div>
        </div>

        <div className={FileExplorerStyles.confirmActions}>
          <button
            className={FileExplorerStyles.confirmCancelBtn}
            onClick={onCancel}
            disabled={busy}
            type="button"
          >
            Cancel
          </button>
          <button
            className={FileExplorerStyles.confirmDeleteBtn}
            onClick={onConfirm}
            disabled={busy}
            type="button"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmation;
