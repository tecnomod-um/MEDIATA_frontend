import React from "react";
import Switch from "react-switch";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Styles from "../fileExplorer.module.css";

/**
 * CleanPanel - Side panel for data cleaning options
 * @param {boolean} show - Whether to show the panel
 * @param {function} onClose - Handler to close the panel
 * @param {boolean} busy - Whether an operation is in progress
 * @param {boolean} removeDuplicates - Remove duplicates option state
 * @param {function} setRemoveDuplicates - Handler to toggle remove duplicates
 * @param {boolean} removeEmptyRows - Remove empty rows option state
 * @param {function} setRemoveEmptyRows - Handler to toggle remove empty rows
 * @param {boolean} standardizeDates - Standardize dates option state
 * @param {function} setStandardizeDates - Handler to toggle standardize dates
 * @param {string} selectedDateFormat - Selected date format
 * @param {function} setSelectedDateFormat - Handler to set date format
 * @param {array} dateFormats - Available date format options
 * @param {boolean} standardizeNumeric - Standardize numeric option state
 * @param {function} setStandardizeNumeric - Handler to toggle standardize numeric
 * @param {string} numericMode - Selected numeric mode
 * @param {function} setNumericMode - Handler to set numeric mode
 * @param {number} selectedCount - Number of selected files
 * @param {function} applyClean - Handler to apply cleaning operations
 */
function CleanPanel({
  show,
  onClose,
  busy,
  removeDuplicates,
  setRemoveDuplicates,
  removeEmptyRows,
  setRemoveEmptyRows,
  standardizeDates,
  setStandardizeDates,
  selectedDateFormat,
  setSelectedDateFormat,
  dateFormats,
  standardizeNumeric,
  setStandardizeNumeric,
  numericMode,
  setNumericMode,
  selectedCount,
  applyClean,
}) {
  if (!show) return null;

  return (
    <div
      className={Styles.cleanOverlay}
      onMouseDown={() => !busy && onClose()}
      role="presentation"
    >
      <div
        className={Styles.cleanPanel}
        role="dialog"
        aria-label="Data cleaning"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <IconButton
          className={Styles.cleanCloseIcon}
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <div className={Styles.cleanBody}>
          <div className={Styles.cleanOption}>
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
            <div className={Styles.cleanOptionText}>
              <div className={Styles.cleanLabel}>Remove duplicates</div>
              <div className={Styles.cleanDesc}>Drops duplicate rows.</div>
            </div>
          </div>

          <div className={Styles.cleanOption}>
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
            <div className={Styles.cleanOptionText}>
              <div className={Styles.cleanLabel}>Remove empty rows</div>
              <div className={Styles.cleanDesc}>Removes rows where all values are empty.</div>
            </div>
          </div>

          <div className={Styles.cleanOptionStack}>
            <div className={Styles.cleanOption}>
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
              <div className={Styles.cleanOptionText}>
                <div className={Styles.cleanLabel}>Standardize dates</div>
                <div className={Styles.cleanDesc}>Normalize date fields to a chosen output format.</div>
              </div>
            </div>

            <div className={Styles.cleanInlineRow}>
              <span className={Styles.cleanInlineLabel}>Output format</span>
              <select
                className={Styles.select}
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

          <div className={Styles.cleanOptionStack}>
            <div className={Styles.cleanOption}>
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
              <div className={Styles.cleanOptionText}>
                <div className={Styles.cleanLabel}>Standardize numeric fields</div>
                <div className={Styles.cleanDesc}>Convert numeric columns to a consistent type.</div>
              </div>
            </div>

            <div className={Styles.cleanInlineRow}>
              <span className={Styles.cleanInlineLabel}>Mode</span>
              <select
                className={Styles.select}
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

        <div className={Styles.cleanFooter}>
          <div className={Styles.cleanFooterLeft}>
            Applies to <b>{selectedCount}</b>
          </div>

          <div className={Styles.cleanFooterRight}>
            <button
              className={Styles.cleanApply}
              onClick={applyClean}
              disabled={busy || selectedCount === 0}
              title="Apply cleaning to selected files"
            >
              Apply
            </button>
            <button
              className={Styles.cleanCancel}
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
