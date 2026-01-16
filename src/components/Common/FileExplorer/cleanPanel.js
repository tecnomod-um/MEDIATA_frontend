import React from "react";
import Switch from "react-switch";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import FileExplorerStyles from "./fileExplorer.module.css";

// Data cleaning panel for file preprocessing options
function CleanPanel({ show, onClose, busy, removeDuplicates, setRemoveDuplicates, removeEmptyRows, setRemoveEmptyRows, standardizeDates, setStandardizeDates, selectedDateFormat, setSelectedDateFormat, dateFormats, standardizeNumeric, setStandardizeNumeric, numericMode, setNumericMode, selectedCount, applyClean }) {
  if (!show) return null;

  return (
    <div
      className={FileExplorerStyles.cleanOverlay}
      onMouseDown={() => !busy && onClose()}
      role="presentation"
    >
      <div
        className={FileExplorerStyles.cleanPanel}
        role="dialog"
        aria-label="Data cleaning"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <IconButton
          className={FileExplorerStyles.cleanCloseIcon}
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <div className={FileExplorerStyles.cleanBody}>
          <div className={FileExplorerStyles.cleanOption}>
            <Switch
              checked={removeDuplicates}
              onChange={(v) => setRemoveDuplicates(v)}
              height={20}
              width={40}
              handleDiameter={16}
              offColor="#888"
              onColor="#9ABDDC"
              disabled={busy}
            />
            <div className={FileExplorerStyles.cleanOptionText}>
              <div className={FileExplorerStyles.cleanLabel}>Remove duplicates</div>
              <div className={FileExplorerStyles.cleanDesc}>Drops duplicate rows.</div>
            </div>
          </div>
          <div className={FileExplorerStyles.cleanOption}>
            <Switch
              checked={removeEmptyRows}
              onChange={(v) => setRemoveEmptyRows(v)}
              height={20}
              width={40}
              handleDiameter={16}
              offColor="#888"
              onColor="#9ABDDC"
              disabled={busy}
            />
            <div className={FileExplorerStyles.cleanOptionText}>
              <div className={FileExplorerStyles.cleanLabel}>Remove empty rows</div>
              <div className={FileExplorerStyles.cleanDesc}>Removes rows where all values are empty.</div>
            </div>
          </div>

          <div className={FileExplorerStyles.cleanOptionStack}>
            <div className={FileExplorerStyles.cleanOption}>
              <Switch
                checked={standardizeDates}
                onChange={(v) => setStandardizeDates(v)}
                height={20}
                width={40}
                handleDiameter={16}
                offColor="#888"
                onColor="#9ABDDC"
                disabled={busy}
              />
              <div className={FileExplorerStyles.cleanOptionText}>
                <div className={FileExplorerStyles.cleanLabel}>Standardize dates</div>
                <div className={FileExplorerStyles.cleanDesc}>Normalize date fields to a chosen output format.</div>
              </div>
            </div>

            <div className={FileExplorerStyles.cleanInlineRow}>
              <span className={FileExplorerStyles.cleanInlineLabel}>Output format</span>
              <select
                className={FileExplorerStyles.select}
                value={selectedDateFormat}
                onChange={(e) => setSelectedDateFormat(e.target.value)}
                disabled={busy || !standardizeDates}
              >
                {dateFormats.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={FileExplorerStyles.cleanOptionStack}>
            <div className={FileExplorerStyles.cleanOption}>
              <Switch
                checked={standardizeNumeric}
                onChange={(v) => setStandardizeNumeric(v)}
                height={20}
                width={40}
                handleDiameter={16}
                offColor="#888"
                onColor="#9ABDDC"
                disabled={busy}
              />
              <div className={FileExplorerStyles.cleanOptionText}>
                <div className={FileExplorerStyles.cleanLabel}>Standardize numeric fields</div>
                <div className={FileExplorerStyles.cleanDesc}>Convert numeric columns to a consistent type.</div>
              </div>
            </div>

            <div className={FileExplorerStyles.cleanInlineRow}>
              <span className={FileExplorerStyles.cleanInlineLabel}>Mode</span>
              <select
                className={FileExplorerStyles.select}
                value={numericMode}
                onChange={(e) => setNumericMode(e.target.value)}
                disabled={busy || !standardizeNumeric}
              >
                <option value="double">Convert to double</option>
                <option value="int_round">Convert to integer (round)</option>
                <option value="int_trunc">Convert to integer (truncate)</option>
              </select>
            </div>
          </div>
        </div>

        <div className={FileExplorerStyles.cleanFooter}>
          <div className={FileExplorerStyles.cleanFooterLeft}>
            Applies to <b>{selectedCount}</b>
          </div>

          <div className={FileExplorerStyles.cleanFooterRight}>
            <button
              className={FileExplorerStyles.cleanApply}
              onClick={applyClean}
              disabled={busy || selectedCount === 0}
              title="Apply cleaning to selected files"
            >
              Apply
            </button>
            <button
              className={FileExplorerStyles.cleanCancel}
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CleanPanel;
