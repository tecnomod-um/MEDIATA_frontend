import React from "react";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Styles from "../fileExplorer.module.css";

/**
 * DeleteConfirmation - Confirmation dialog for deleting files
 * @param {boolean} show - Whether to show the confirmation dialog
 * @param {number} selectedCount - Number of files to be deleted
 * @param {function} onCancel - Handler to cancel deletion
 * @param {function} onConfirm - Handler to confirm deletion
 * @param {boolean} busy - Whether an operation is in progress
 */
function DeleteConfirmation({ show, selectedCount, onCancel, onConfirm, busy }) {
  if (!show) return null;

  return (
    <div
      className={Styles.confirmOverlay}
      onMouseDown={() => !busy && onCancel()}
      role="presentation"
    >
      <div
        className={Styles.confirmCard}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Delete confirmation"
      >
        <IconButton
          className={Styles.confirmCloseIcon}
          onClick={onCancel}
          disabled={busy}
          aria-label="Close"
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <div className={Styles.confirmHeader}>
          <div className={Styles.confirmTitle}>Delete</div>
          <div className={Styles.confirmText}>
            Delete {selectedCount} file{selectedCount === 1 ? "" : "s"}?
          </div>
        </div>

        <div className={Styles.confirmActions}>
          <button
            className={Styles.confirmCancelBtn}
            onClick={onCancel}
            disabled={busy}
            type="button"
          >
            Cancel
          </button>
          <button
            className={Styles.confirmDeleteBtn}
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
