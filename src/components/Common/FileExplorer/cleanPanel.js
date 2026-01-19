import React from "react";
import Switch from "react-switch";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import FileExplorerStyles from "./fileExplorer.module.css";

function CleanPanel({ show, onClose, busy, removeDuplicates, setRemoveDuplicates, removeEmptyRows, setRemoveEmptyRows, standardizeDates, setStandardizeDates, selectedDateFormat, setSelectedDateFormat, dateFormats, standardizeNumeric, setStandardizeNumeric, numericMode, setNumericMode, numericColumnsText, setNumericColumnsText, selectedCount, applyClean }) {
  if (!show) return null;

  const dateDisabled = busy || !standardizeDates;
  const numericDisabled = busy || !standardizeNumeric;
  const enabledCount =
    (removeDuplicates ? 1 : 0) +
    (removeEmptyRows ? 1 : 0) +
    (standardizeDates ? 1 : 0) +
    (standardizeNumeric ? 1 : 0);

  const enabledLabel =
    enabledCount === 1 ? "1 step selected" : `${enabledCount} steps selected`;

  return (
    <div className={FileExplorerStyles.cleanPanel} role="dialog" aria-label="Data cleaning">
      <IconButton
        className={FileExplorerStyles.cleanCloseIcon}
        onClick={onClose}
        disabled={busy}
        aria-label="Close"
        size="small"
      >
        <CloseIcon fontSize="small" />
      </IconButton>

      <div className={FileExplorerStyles.cleanHeader}>
        <div className={FileExplorerStyles.cleanHeaderText}>
          <div className={FileExplorerStyles.cleanTitle}>Data cleaning</div>
          <div className={FileExplorerStyles.cleanSubtitle}>
            Configure altering preprocessing steps to correct and improve the selected file{selectedCount === 1 ? "" : "s"}.
          </div>
        </div>
      </div>

      <div className={FileExplorerStyles.cleanBody}>
        <div className={FileExplorerStyles.cleanSection}>
          <div className={FileExplorerStyles.cleanRow}>
            <div className={FileExplorerStyles.cleanSwitchCol}>
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
            </div>
            <div className={FileExplorerStyles.cleanMainCol}>
              <div className={FileExplorerStyles.cleanLabel}>Remove duplicates</div>
              <div className={FileExplorerStyles.cleanDesc}>
                Keep only the first occurrence of identical rows. Useful when data was merged or exported multiple times.
              </div>
            </div>
          </div>

          <div className={FileExplorerStyles.cleanRow}>
            <div className={FileExplorerStyles.cleanSwitchCol}>
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
            </div>
            <div className={FileExplorerStyles.cleanMainCol}>
              <div className={FileExplorerStyles.cleanLabel}>Remove empty rows</div>
              <div className={FileExplorerStyles.cleanDesc}>
                Drop rows where every cell is blank (or whitespace). Helps remove trailing empty records and separators.
              </div>
            </div>
          </div>
        </div>

        <div className={FileExplorerStyles.cleanSection}>
          <div className={FileExplorerStyles.cleanRow}>
            <div className={FileExplorerStyles.cleanSwitchCol}>
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
            </div>
            <div className={FileExplorerStyles.cleanMainCol}>
              <div className={FileExplorerStyles.cleanLabelRow}>
                <div className={FileExplorerStyles.cleanLabel}>Standardize dates</div>
                <span
                  className={`${FileExplorerStyles.cleanInlineHint} ${dateDisabled ? FileExplorerStyles.cleanInlineHintShow : FileExplorerStyles.cleanInlineHintHide
                    }`}
                  aria-hidden={!dateDisabled}
                >
                  (Turn on to select the output format)
                </span>
              </div>

              <div className={FileExplorerStyles.cleanDesc}>
                Convert recognized date columns into a consistent output format. Helps downstream parsing and comparisons.
              </div>

              <div className={FileExplorerStyles.cleanFieldRow}>
                <div className={FileExplorerStyles.cleanFieldLabel}>Output format</div>
                <select
                  className={FileExplorerStyles.cleanControl}
                  value={selectedDateFormat}
                  onChange={(e) => setSelectedDateFormat(e.target.value)}
                  disabled={dateDisabled}
                >
                  {dateFormats.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </div>
        </div>

        <div className={FileExplorerStyles.cleanSection}>
          <div className={FileExplorerStyles.cleanRow}>
            <div className={FileExplorerStyles.cleanSwitchCol}>
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
            </div>
            <div className={FileExplorerStyles.cleanMainCol}>
              <div className={FileExplorerStyles.cleanLabelRow}>
                <div className={FileExplorerStyles.cleanLabel}>Standardize numeric fields</div>
                <span
                  className={`${FileExplorerStyles.cleanInlineHint} ${numericDisabled ? FileExplorerStyles.cleanInlineHintShow : FileExplorerStyles.cleanInlineHintHide
                    }`}
                  aria-hidden={!numericDisabled}
                >
                  (Turn on to choose mode and affected columns)
                </span>
              </div>

              <div className={FileExplorerStyles.cleanDesc}>
                Coerce selected columns into a consistent numeric type.
              </div>

              <div className={FileExplorerStyles.cleanFieldRow}>
                <div className={FileExplorerStyles.cleanFieldLabel}>Mode</div>
                <select
                  className={FileExplorerStyles.cleanControl}
                  value={numericMode}
                  onChange={(e) => setNumericMode(e.target.value)}
                  disabled={numericDisabled}
                >
                  <option value="double">Convert to decimal (double)</option>
                  <option value="int_round">Convert to integer (round)</option>
                  <option value="int_trunc">Convert to integer (truncate)</option>
                </select>
              </div>

              <div className={FileExplorerStyles.cleanFieldRow}>
                <div className={FileExplorerStyles.cleanFieldLabel}>Columns</div>
                <input
                  className={FileExplorerStyles.cleanControl}
                  value={numericColumnsText}
                  onChange={(e) => setNumericColumnsText(e.target.value)}
                  disabled={numericDisabled}
                  placeholder="Comma-separated, e.g. age,height,weight"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={FileExplorerStyles.cleanFooter}>
        <div className={FileExplorerStyles.cleanFooterLeft}>
          {selectedCount === 1
            ? `Applying to the selected file, ${enabledLabel}`
            : `Applying to the selected ${selectedCount} files, ${enabledLabel}`}
        </div>

        <div className={FileExplorerStyles.cleanFooterRight}>
          <button
            className={FileExplorerStyles.cleanCancel}
            onClick={onClose}
            disabled={busy}
            type="button"
          >
            Cancel
          </button>

          <button
            className={FileExplorerStyles.cleanApply}
            onClick={applyClean}
            disabled={busy || selectedCount === 0}
            title="Apply cleaning to selected files"
            type="button"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default CleanPanel;
