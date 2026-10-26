import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import FileExplorerStyles from "./fileExplorer.module.css";

function DeleteConfirmation({ show, selectedCount, onCancel, onConfirm, busy, title = "Delete", message, confirmLabel = "Delete", portal = false }) {
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (show) cancelButtonRef.current?.focus();
  }, [show]);

  if (!show) return null;

  const dialog = (
    <div
      className={`${FileExplorerStyles.confirmOverlay} ${portal ? FileExplorerStyles.confirmOverlayFixed : ""}`}
      onMouseDown={() => !busy && onCancel()}
      role="presentation"
    >
      <div
        className={FileExplorerStyles.confirmCard}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !busy) onCancel();
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} confirmation`}
      >
        <IconButton
          className={FileExplorerStyles.cleanCloseIcon}
          onClick={onCancel}
          disabled={busy}
          aria-label="Close"
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <div className={FileExplorerStyles.confirmHeader}>
          <div className={FileExplorerStyles.confirmTitle}>{title}</div>
          <div className={FileExplorerStyles.confirmText}>
            {message ?? `Delete ${selectedCount} file${selectedCount === 1 ? "" : "s"}?`}
          </div>
        </div>

        <div className={FileExplorerStyles.confirmActions}>
          <button
            ref={cancelButtonRef}
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
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return portal ? createPortal(dialog, document.body) : dialog;
}

export default DeleteConfirmation;
