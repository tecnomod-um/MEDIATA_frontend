import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Switch from "react-switch";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { toast } from "react-toastify";
import { parseJsonObject } from "../../../util/parser";
import FileExplorerStyles from "./fileExplorer.module.css";
import JsonMapEditor from "./jsonMapEditor.js";

const VisibleCountContext = React.createContext(null);

function ToggleRow({ busy, checked, onToggle, children }) {
  const onClick = useCallback(
    (e) => {
      if (busy) return;
      const el = e.target;
      if (el.closest?.('input, button, select, textarea, a, [role="button"], [data-no-row-toggle]')) {
        return;
      }
      onToggle(!checked);
    },
    [busy, checked, onToggle]
  );

  const onKeyDown = useCallback(
    (e) => {
      if (busy) return;
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      onToggle(!checked);
    },
    [busy, checked, onToggle]
  );

  return (
    <div
      onClick={onClick}
      onKeyDown={onKeyDown}
      role="switch"
      aria-checked={checked}
      tabIndex={busy ? -1 : 0}
      className={FileExplorerStyles.cleanMainColToggle}
    >
      {children}
    </div>
  );
}


function FilterableOption({ label, desc, children, cleanSearchNorm }) {
  const visibleCountRef = useContext(VisibleCountContext);

  if (!cleanSearchNorm) return children;
  const searchText = `${label} ${desc || ""}`.toLowerCase();
  if (!searchText.includes(cleanSearchNorm)) return null;

  if (visibleCountRef) visibleCountRef.current++;
  return children;
}

// Contains all data cleaning options and logic
function CleanPanel({ show, onClose, busy, selectedCount, onApply }) {

  const [cleanSearch, setCleanSearch] = useState("");
  const cleanSearchNorm = useMemo(() => String(cleanSearch || "").trim().toLowerCase(), [cleanSearch]);
  const visibleOptionsCount = useRef(0);
  const [showNoResults, setShowNoResults] = useState(false);

  // Update showNoResults after render based on actual visible count
  useLayoutEffect(() => {
    if (cleanSearchNorm) {
      setShowNoResults(visibleOptionsCount.current === 0);
    } else {
      setShowNoResults(false);
    }
  }, [cleanSearchNorm, visibleOptionsCount.current]);


  const dateFormats = useMemo(
    () => [
      { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
      { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
      { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
      { value: "YYYY/MM/DD", label: "YYYY/MM/DD" },
      { value: "DD-MM-YYYY", label: "DD-MM-YYYY" },
      { value: "MM-DD-YYYY", label: "MM-DD-YYYY" },
    ],
    []
  );

  const initialOpts = useMemo(
    () => ({
      removeDuplicates: false,
      removeEmptyRows: false,

      trimWhitespace: false,
      removeExtraSpaces: false,
      removeLineBreaks: false,
      normalizeText: false,
      standardizeCase: false,
      caseMode: "lower",
      removeSpecialCharacters: false,
      specialCharColumnsPattern: "",
      removePunctuation: false,
      removeNonPrintableChars: false,

      fixEncoding: false,
      normalizeUnicode: false,
      unicodeNormalization: "NFC",

      standardizeDates: false,
      dateOutputFormat: "YYYY-MM-DD",
      extractDateComponents: false,

      standardizeNumeric: false,
      numericMode: "double",
      numericColumns: [],
      removeLeadingZeros: false,
      roundDecimals: false,
      decimalPlaces: 2,

      fillMissingValues: false,
      fillStrategy: "mean",
      fillConstantValue: "",
      fillColumns: [],

      replaceValues: false,
      replacementMap: {},
      stripPrefix: false,
      prefixToStrip: "",
      stripSuffix: false,
      suffixToStrip: "",
      padValues: false,
      padDirection: "right",
      padLength: 0,
      padCharacter: " ",

      convertDataTypes: false,
      typeConversionMap: {},

      extractEmailDomain: false,
      validateEmails: false,
      extractURLComponents: false,
      normalizeURLs: false,

      standardizePhoneNumbers: false,
      phoneFormat: "national",
      defaultCountryCode: "+1",

      splitColumn: false,
      columnToSplit: "",
      splitDelimiter: ",",
      newColumnNames: [],
      mergeColumns: false,
      columnsToMerge: [],
      mergeDelimiter: " ",
      mergedColumnName: "merged_column",

      removeRowsWithPattern: false,
      rowFilterColumn: "",
      rowFilterPattern: "",
      keepOnlyNumericRows: false,
      numericValidationColumns: [],

      normalizeData: false,
      normalizeColumns: [],
      standardizeData: false,
      standardizeColumns: [],
      binData: false,
      binColumn: "",
      binEdges: [],
      binLabels: [],

      mergeSimilarValues: false,
      fuzzyMatchColumns: [],
      mergeSimilarityAlgorithm: "levenshtein",
      mergeSimilarityThreshold: 0.85,
      mergeCaseInsensitive: true,
      mergeTrimValues: true,
      mergePreferredValue: "most_frequent",
    }),
    []
  );

  const [opts, setOpts] = useState(initialOpts);

  const [replacementMapText, setReplacementMapText] = useState("{}");
  const [typeConversionMapText, setTypeConversionMapText] = useState("{}");

  // Keep internal state clean when panel opens/closes (optional: comment out if you want persistence)
  useEffect(() => {
    if (!show) return;
    // No-op by default; if you want reset on open:
    // setOpts(initialOpts);
    // setReplacementMapText("{}");
    // setTypeConversionMapText("{}");
  }, [show, initialOpts]);

  const update = useCallback((key, value) => {
    setOpts((o) => ({ ...o, [key]: value }));
  }, []);

  const toList = useCallback((csv) => {
    return String(csv || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, []);

  const enabledCount = useMemo(() => {
    return Object.values(opts).filter((v) => typeof v === "boolean" && v).length;
  }, [opts]);

  const enabledLabel = enabledCount === 1 ? "1 step selected" : `${enabledCount} steps selected`;

  const dateDisabled = busy || !opts.standardizeDates;
  const numericDisabled = busy || !opts.standardizeNumeric;

  const payload = useMemo(() => {
    const p = {
      ...opts,
      dateOutputFormat: opts.dateOutputFormat,
      numericColumns: Array.isArray(opts.numericColumns) ? opts.numericColumns : [],
      fillColumns: Array.isArray(opts.fillColumns) ? opts.fillColumns : [],
      newColumnNames: Array.isArray(opts.newColumnNames) ? opts.newColumnNames : [],
      columnsToMerge: Array.isArray(opts.columnsToMerge) ? opts.columnsToMerge : [],
      numericValidationColumns: Array.isArray(opts.numericValidationColumns) ? opts.numericValidationColumns : [],
      normalizeColumns: Array.isArray(opts.normalizeColumns) ? opts.normalizeColumns : [],
      standardizeColumns: Array.isArray(opts.standardizeColumns) ? opts.standardizeColumns : [],
      fuzzyMatchColumns: Array.isArray(opts.fuzzyMatchColumns) ? opts.fuzzyMatchColumns : [],
      binEdges: Array.isArray(opts.binEdges) ? opts.binEdges : [],
      binLabels: Array.isArray(opts.binLabels) ? opts.binLabels : [],
    };

    return p;
  }, [opts]);

  const handleApply = useCallback(() => {
    if (busy) return;

    if (enabledCount === 0) {
      toast.error("Select at least one cleaning step.");
      return;
    }

    if (opts.standardizeNumeric && (!opts.numericColumns || opts.numericColumns.length === 0)) {
      toast.error("Please specify numeric columns (comma-separated).");
      return;
    }

    if (opts.fillMissingValues && (!opts.fillStrategy || String(opts.fillStrategy).trim() === "")) {
      toast.error("Please choose a fill strategy.");
      return;
    }

    if (opts.fillMissingValues && opts.fillStrategy === "constant" && String(opts.fillConstantValue).trim() === "") {
      toast.error("Please provide a constant fill value.");
      return;
    }

    if (opts.replaceValues) {
      const res = parseJsonObject(replacementMapText, { fallback: {}, allowEmpty: false });

      if (!res.ok) {
        if (res.error.message === "Not a JSON object") {
          toast.error('Replacement map must be a JSON object (e.g. {"a":"b"}).');
        } else if (res.error.message === "Empty JSON") {
          toast.error("Replacement map cannot be empty.");
        } else {
          toast.error("Replacement map is not valid JSON.");
        }
        return;
      }

      payload.replacementMap = res.value;
    }

    if (opts.convertDataTypes) {
      const res = parseJsonObject(typeConversionMapText, { fallback: {}, allowEmpty: false });

      if (!res.ok) {
        if (res.error.message === "Not a JSON object") {
          toast.error('Type conversion map must be a JSON object (e.g. {"col":"integer"}).');
        } else if (res.error.message === "Empty JSON") {
          toast.error("Type conversion map cannot be empty.");
        } else {
          toast.error("Type conversion map is not valid JSON.");
        }
        return;
      }

      payload.typeConversionMap = res.value;
    }

    if (opts.padValues) {
      if (!opts.padLength || Number(opts.padLength) <= 0) {
        toast.error("Pad length must be greater than 0.");
        return;
      }
      const ch = String(opts.padCharacter || " ").slice(0, 1);
      payload.padCharacter = ch || " ";
    }

    if (opts.splitColumn) {
      if (!String(opts.columnToSplit || "").trim()) {
        toast.error("Column to split is required.");
        return;
      }
    }

    if (opts.mergeColumns) {
      if (!opts.columnsToMerge || opts.columnsToMerge.length < 2) {
        toast.error("Please provide at least 2 columns to merge.");
        return;
      }
      if (!String(opts.mergedColumnName || "").trim()) {
        toast.error("Merged column name is required.");
        return;
      }
    }

    if (opts.removeRowsWithPattern) {
      if (!String(opts.rowFilterColumn || "").trim() || !String(opts.rowFilterPattern || "").trim()) {
        toast.error("Row filter column and pattern are required.");
        return;
      }
    }

    if (opts.keepOnlyNumericRows && (!opts.numericValidationColumns || opts.numericValidationColumns.length === 0)) {
      toast.error("Please specify validation columns for 'Keep only numeric rows'.");
      return;
    }

    if (opts.normalizeData && (!opts.normalizeColumns || opts.normalizeColumns.length === 0)) {
      toast.error("Please specify columns to normalize.");
      return;
    }

    if (opts.standardizeData && (!opts.standardizeColumns || opts.standardizeColumns.length === 0)) {
      toast.error("Please specify columns to standardize (Z-score).");
      return;
    }

    if (opts.binData) {
      if (!String(opts.binColumn || "").trim()) {
        toast.error("Bin column is required.");
        return;
      }
      if (!opts.binEdges || opts.binEdges.length < 2) {
        toast.error("Bin edges must include at least 2 numbers (e.g. 0,10,20).");
        return;
      }
    }

    if (opts.mergeSimilarValues) {
      if (!opts.fuzzyMatchColumns || opts.fuzzyMatchColumns.length === 0) {
        toast.error("Please specify columns for fuzzy merge.");
        return;
      }
      const t = Number(opts.mergeSimilarityThreshold);
      if (Number.isNaN(t) || t <= 0 || t > 1) {
        toast.error("Similarity threshold must be between 0 and 1.");
        return;
      }
    }

    onApply(payload);
  }, [busy, enabledCount, onApply, opts, payload, replacementMapText, typeConversionMapText]);

  if (!show) return null;

  // Reset visible count before each render
  visibleOptionsCount.current = 0;

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
        <div className={FileExplorerStyles.cleanHeaderRow}>
          <div className={FileExplorerStyles.cleanHeaderLeft}>
            <div className={FileExplorerStyles.cleanTitle}>Data cleaning</div>
            <div className={FileExplorerStyles.cleanSubtitle}>
              Configure preprocessing steps for the selected file{selectedCount === 1 ? "" : "s"}.
            </div>
          </div>

          <input
            className={FileExplorerStyles.cleanHeaderSearch}
            value={cleanSearch}
            onChange={(e) => setCleanSearch(e.target.value)}
            placeholder="Search steps…"
            disabled={busy}
            aria-label="Search cleaning steps"
          />
        </div>
      </div>



      <VisibleCountContext.Provider value={visibleOptionsCount}>
        <div className={FileExplorerStyles.cleanBody}>
          {showNoResults ? (
            <div className={FileExplorerStyles.cleanNoResults} id="cleanPanelNoResults">
              No steps match your search
            </div>
          ) : (
            <>
              <div className={FileExplorerStyles.cleanSection}>

                <FilterableOption label="Remove duplicates" desc="Keep only the first occurrence of identical rows." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.removeDuplicates}
                        onChange={(v) => update("removeDuplicates", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>
                    <ToggleRow busy={busy} checked={opts.removeDuplicates} onToggle={(v) => update("removeDuplicates", v)}>
                      <div className={FileExplorerStyles.cleanLabel}>Remove duplicates</div>
                      <div className={FileExplorerStyles.cleanDesc}>Keep only the first occurrence of identical rows.</div>
                    </ToggleRow>
                  </div>
                </FilterableOption>
                <FilterableOption label="Remove empty rows" desc="Drop rows where every cell is blank (or whitespace)." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.removeEmptyRows}
                        onChange={(v) => update("removeEmptyRows", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>
                    <ToggleRow busy={busy} checked={opts.removeEmptyRows} onToggle={(v) => update("removeEmptyRows", v)}>
                      <div className={FileExplorerStyles.cleanLabel}>Remove empty rows</div>
                      <div className={FileExplorerStyles.cleanDesc}>Drop rows where every cell is blank (or whitespace).</div>
                    </ToggleRow>
                  </div>
                </FilterableOption>
              </div>

              <div className={FileExplorerStyles.cleanSection}>
                <FilterableOption label="Trim whitespace" desc="Trim leading and trailing whitespace in all cells." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.trimWhitespace}
                        onChange={(v) => update("trimWhitespace", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>
                    <ToggleRow busy={busy} checked={opts.trimWhitespace} onToggle={(v) => update("trimWhitespace", v)}>
                      <div className={FileExplorerStyles.cleanLabel}>Trim whitespace</div>
                      <div className={FileExplorerStyles.cleanDesc}>Trim leading and trailing whitespace in all cells.</div>
                    </ToggleRow>
                  </div>
                </FilterableOption>
                <FilterableOption label="Remove extra spaces" desc="Collapse repeated whitespace inside values." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.removeExtraSpaces}
                        onChange={(v) => update("removeExtraSpaces", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>
                    <ToggleRow busy={busy} checked={opts.removeExtraSpaces} onToggle={(v) => update("removeExtraSpaces", v)}>
                      <div className={FileExplorerStyles.cleanLabel}>Remove extra spaces</div>
                      <div className={FileExplorerStyles.cleanDesc}>Collapse repeated whitespace inside values.</div>
                    </ToggleRow>
                  </div>
                </FilterableOption>
                <FilterableOption label="Remove line breaks" desc="Replace CR/LF sequences with spaces." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.removeLineBreaks}
                        onChange={(v) => update("removeLineBreaks", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>
                    <ToggleRow busy={busy} checked={opts.removeLineBreaks} onToggle={(v) => update("removeLineBreaks", v)}>
                      <div className={FileExplorerStyles.cleanLabel}>Remove line breaks</div>
                      <div className={FileExplorerStyles.cleanDesc}>Replace CR/LF sequences with spaces.</div>
                    </ToggleRow>
                  </div>
                </FilterableOption>
                <FilterableOption label="Normalize text" desc="General cleanup of whitespace (safe normalization)." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.normalizeText}
                        onChange={(v) => update("normalizeText", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>
                    <ToggleRow busy={busy} checked={opts.normalizeText} onToggle={(v) => update("normalizeText", v)}>
                      <div className={FileExplorerStyles.cleanLabel}>Normalize text</div>
                      <div className={FileExplorerStyles.cleanDesc}>General cleanup of whitespace (safe normalization).</div>
                    </ToggleRow>
                  </div>
                </FilterableOption>
                <FilterableOption label="Standardize case" desc="Convert text into a consistent casing." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.standardizeCase}
                        onChange={(v) => update("standardizeCase", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>
                    <ToggleRow busy={busy} checked={opts.standardizeCase} onToggle={(v) => update("standardizeCase", v)}>
                      <div className={FileExplorerStyles.cleanLabelRow}>
                        <div className={FileExplorerStyles.cleanLabel}>Standardize case</div>
                        <span
                          className={`${FileExplorerStyles.cleanInlineHint} ${busy || !opts.standardizeCase
                            ? FileExplorerStyles.cleanInlineHintShow
                            : FileExplorerStyles.cleanInlineHintHide
                            }`}
                          aria-hidden={!(busy || !opts.standardizeCase)}
                        >
                          (Turn on to select mode)
                        </span>
                      </div>

                      <div className={FileExplorerStyles.cleanDesc}>Convert text into a consistent casing.</div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle  >
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Mode</div>
                        <select
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          value={opts.caseMode}
                          onChange={(e) => update("caseMode", e.target.value)}
                          disabled={busy || !opts.standardizeCase}
                        >
                          <option value="lower">lowercase</option>
                          <option value="upper">UPPERCASE</option>
                          <option value="title">Title Case</option>
                          <option value="sentence">Sentence case</option>
                        </select>
                      </div>
                    </ToggleRow>
                  </div>
                </FilterableOption>
              </div>

              <div className={FileExplorerStyles.cleanSection}>
                <FilterableOption label="Remove special characters" desc="Remove non alphanumeric symbols (keeps basic separators)." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.removeSpecialCharacters}
                        onChange={(v) => update("removeSpecialCharacters", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>
                    <ToggleRow
                      busy={busy}
                      checked={opts.removeSpecialCharacters}
                      onToggle={(v) => update("removeSpecialCharacters", v)}
                    >
                      <div className={FileExplorerStyles.cleanLabel}>Remove special characters</div>
                      <div className={FileExplorerStyles.cleanDesc}>
                        Remove non alphanumeric symbols (keeps basic separators).
                      </div>
                    </ToggleRow>
                  </div>
                </FilterableOption>
                <FilterableOption label="Remove punctuation" desc="Strip punctuation characters." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.removePunctuation}
                        onChange={(v) => update("removePunctuation", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>
                    <ToggleRow busy={busy} checked={opts.removePunctuation} onToggle={(v) => update("removePunctuation", v)}>
                      <div className={FileExplorerStyles.cleanLabel}>Remove punctuation</div>
                      <div className={FileExplorerStyles.cleanDesc}>Strip punctuation characters.</div>
                    </ToggleRow>
                  </div>
                </FilterableOption>
                <FilterableOption label="Remove non-printable characters" desc="Strip control/non-printable Unicode characters." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.removeNonPrintableChars}
                        onChange={(v) => update("removeNonPrintableChars", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>
                    <ToggleRow
                      busy={busy}
                      checked={opts.removeNonPrintableChars}
                      onToggle={(v) => update("removeNonPrintableChars", v)}
                    >
                      <div className={FileExplorerStyles.cleanLabel}>Remove non-printable characters</div>
                      <div className={FileExplorerStyles.cleanDesc}>Strip control/non-printable Unicode characters.</div>
                    </ToggleRow>
                  </div>
                </FilterableOption>
                <FilterableOption label="Fix encoding issues" desc="Attempt to repair common mojibake encoding problems." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.fixEncoding}
                        onChange={(v) => update("fixEncoding", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>
                    <ToggleRow busy={busy} checked={opts.fixEncoding} onToggle={(v) => update("fixEncoding", v)}>
                      <div className={FileExplorerStyles.cleanLabel}>Fix encoding issues</div>
                      <div className={FileExplorerStyles.cleanDesc}>Attempt to repair common mojibake encoding problems.</div>
                    </ToggleRow>
                  </div>
                </FilterableOption>
                <FilterableOption label="Normalize Unicode" desc="Normalize Unicode representation (NFC/NFD/NFKC/NFKD)." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.normalizeUnicode}
                        onChange={(v) => update("normalizeUnicode", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>
                    <ToggleRow busy={busy} checked={opts.normalizeUnicode} onToggle={(v) => update("normalizeUnicode", v)}>
                      <div className={FileExplorerStyles.cleanLabelRow}>
                        <div className={FileExplorerStyles.cleanLabel}>Normalize Unicode</div>
                        <span
                          className={`${FileExplorerStyles.cleanInlineHint} ${busy || !opts.normalizeUnicode
                            ? FileExplorerStyles.cleanInlineHintShow
                            : FileExplorerStyles.cleanInlineHintHide
                            }`}
                          aria-hidden={!(busy || !opts.normalizeUnicode)}
                        >
                          (Turn on to select form)
                        </span>
                      </div>

                      <div className={FileExplorerStyles.cleanDesc}>Normalize Unicode representation (NFC/NFD/NFKC/NFKD).</div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle  >
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Form</div>
                        <select
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          value={opts.unicodeNormalization}
                          onChange={(e) => update("unicodeNormalization", e.target.value)}
                          disabled={busy || !opts.normalizeUnicode}
                        >
                          <option value="NFC">NFC</option>
                          <option value="NFD">NFD</option>
                          <option value="NFKC">NFKC</option>
                          <option value="NFKD">NFKD</option>
                        </select>
                      </div>
                    </ToggleRow>
                  </div>
                </FilterableOption>
              </div>

              <div className={FileExplorerStyles.cleanSection}>
                <FilterableOption label="Standardize dates" desc="Convert recognized date values into a consistent output format." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.standardizeDates}
                        onChange={(v) => update("standardizeDates", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>
                    <ToggleRow busy={busy} checked={opts.standardizeDates} onToggle={(v) => update("standardizeDates", v)}>
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
                        Convert recognized date values into a consistent output format.
                      </div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle  >
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Output format</div>
                        <select
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          value={opts.dateOutputFormat}
                          onChange={(e) => update("dateOutputFormat", e.target.value)}
                          disabled={dateDisabled}
                        >
                          {dateFormats.map((d) => (
                            <option key={d.value} value={d.value}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle  >
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Components</div>
                        <label className={FileExplorerStyles.cleanCheckboxLabel} data-no-row-toggle>
                          <input
                            type="checkbox"
                            checked={opts.extractDateComponents}
                            onChange={(e) => update("extractDateComponents", e.target.checked)}
                            disabled={busy}
                          />
                          Extract year/month/day columns
                        </label>
                      </div>
                    </ToggleRow>
                  </div>
                </FilterableOption>
              </div>

              <div className={FileExplorerStyles.cleanSection}>
                <FilterableOption label="Standardize numeric fields" desc="Coerce selected columns into a consistent numeric type." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.standardizeNumeric}
                        onChange={(v) => update("standardizeNumeric", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>
                    <ToggleRow busy={busy} checked={opts.standardizeNumeric} onToggle={(v) => update("standardizeNumeric", v)}>
                      <div className={FileExplorerStyles.cleanLabelRow}>
                        <div className={FileExplorerStyles.cleanLabel}>Standardize numeric fields</div>
                        <span
                          className={`${FileExplorerStyles.cleanInlineHint} ${numericDisabled ? FileExplorerStyles.cleanInlineHintShow : FileExplorerStyles.cleanInlineHintHide
                            }`}
                          aria-hidden={!numericDisabled}
                        >
                          (Turn on to choose mode and columns)
                        </span>
                      </div>

                      <div className={FileExplorerStyles.cleanDesc}>Coerce selected columns into a consistent numeric type.</div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle  >
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Mode</div>
                        <select
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          value={opts.numericMode}
                          onChange={(e) => update("numericMode", e.target.value)}
                          disabled={numericDisabled}
                        >
                          <option value="double">Convert to decimal (double)</option>
                          <option value="int_round">Convert to integer (round)</option>
                          <option value="int_trunc">Convert to integer (truncate)</option>
                        </select>
                      </div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle  >
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Columns</div>
                        <input
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          value={(opts.numericColumns || []).join(",")}
                          onChange={(e) => update("numericColumns", toList(e.target.value))}
                          disabled={numericDisabled}
                          placeholder="Comma-separated, e.g. age,height,weight"
                        />
                      </div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle  >
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Extras</div>
                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }} data-no-row-toggle>
                          <label className={FileExplorerStyles.cleanCheckboxLabel} data-no-row-toggle>
                            <input
                              type="checkbox"
                              checked={opts.removeLeadingZeros}
                              onChange={(e) => update("removeLeadingZeros", e.target.checked)}
                              disabled={busy}
                            />
                            Remove leading zeros
                          </label>

                          <label className={FileExplorerStyles.cleanCheckboxLabel} data-no-row-toggle>
                            <input
                              type="checkbox"
                              checked={opts.roundDecimals}
                              onChange={(e) => update("roundDecimals", e.target.checked)}
                              disabled={busy}
                            />
                            Round decimals
                          </label>
                        </div>
                      </div>

                      {opts.roundDecimals && (
                        <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle  >
                          <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Decimal places</div>
                          <input
                            className={FileExplorerStyles.cleanControl} data-no-row-toggle
                            type="number"
                            min={0}
                            max={10}
                            value={opts.decimalPlaces}
                            onChange={(e) => update("decimalPlaces", Number(e.target.value))}
                            disabled={busy}

                          />
                        </div>
                      )}
                    </ToggleRow>
                  </div>
                </FilterableOption>
              </div>

              <div className={FileExplorerStyles.cleanSection}>
                <FilterableOption label="Fill missing values" desc="Fill blanks using statistical or rule-based strategies." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.fillMissingValues}
                        onChange={(v) => update("fillMissingValues", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>
                    <ToggleRow busy={busy} checked={opts.fillMissingValues} onToggle={(v) => update("fillMissingValues", v)}>
                      <div className={FileExplorerStyles.cleanLabelRow}>
                        <div className={FileExplorerStyles.cleanLabel}>Fill missing values</div>
                        <span
                          className={`${FileExplorerStyles.cleanInlineHint} ${busy || !opts.fillMissingValues
                            ? FileExplorerStyles.cleanInlineHintShow
                            : FileExplorerStyles.cleanInlineHintHide
                            }`}
                          aria-hidden={!(busy || !opts.fillMissingValues)}
                        >
                          (Turn on to configure)
                        </span>
                      </div>

                      <div className={FileExplorerStyles.cleanDesc}>Fill blanks using statistical or rule-based strategies.</div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle  >
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Strategy</div>
                        <select
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          value={opts.fillStrategy}
                          onChange={(e) => update("fillStrategy", e.target.value)}
                          disabled={busy || !opts.fillMissingValues}

                        >
                          <option value="mean">Mean</option>
                          <option value="median">Median</option>
                          <option value="mode">Mode</option>
                          <option value="constant">Constant</option>
                          <option value="forward">Forward fill</option>
                          <option value="backward">Backward fill</option>
                          <option value="interpolate">Interpolate</option>
                        </select>
                      </div>

                      {opts.fillMissingValues && opts.fillStrategy === "constant" && (
                        <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle  >
                          <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Constant</div>
                          <input
                            className={FileExplorerStyles.cleanControl} data-no-row-toggle
                            value={opts.fillConstantValue}
                            onChange={(e) => update("fillConstantValue", e.target.value)}
                            disabled={busy}
                            placeholder="Value to use for blanks"
                          />
                        </div>
                      )}

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle  >
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Columns</div>
                        <input
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          value={(opts.fillColumns || []).join(",")}
                          onChange={(e) => update("fillColumns", toList(e.target.value))}
                          disabled={busy || !opts.fillMissingValues}
                          placeholder="Blank = all columns; or list: colA,colB"
                        />
                      </div>
                    </ToggleRow>
                  </div>
                </FilterableOption>
              </div>

              <div className={FileExplorerStyles.cleanSection}>
                <FilterableOption label="Replace values" desc="Replace exact matches using a JSON object map (old_value → new_value)." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.replaceValues}
                        onChange={(v) => update("replaceValues", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>

                    <ToggleRow busy={busy} checked={opts.replaceValues} onToggle={(v) => update("replaceValues", v)}>
                      <div className={FileExplorerStyles.cleanLabelRow}>
                        <div className={FileExplorerStyles.cleanLabel}>Replace values</div>
                        <span
                          className={`${FileExplorerStyles.cleanInlineHint} ${busy || !opts.replaceValues
                            ? FileExplorerStyles.cleanInlineHintShow
                            : FileExplorerStyles.cleanInlineHintHide
                            }`}
                          aria-hidden={!(busy || !opts.replaceValues)}
                        >
                          (Turn on to provide map)
                        </span>
                      </div>

                      <div className={FileExplorerStyles.cleanDesc}>
                        Replace exact matches using a JSON object map (old_value → new_value).
                      </div>

                      <JsonMapEditor
                        busy={busy}
                        enabled={opts.replaceValues}
                        label="Map"
                        description="Replace exact matches (key → value)."
                        valueText={replacementMapText}
                        onChangeText={setReplacementMapText}
                        allowEmpty={false}
                        examples={[
                          { name: "Common cleanup", value: { NA: "", N_A: "", null: "" } },
                          { name: "Yes/No", value: { yes: "true", no: "false" } },
                        ]}
                      />

                    </ToggleRow>
                  </div>
                </FilterableOption>

                <FilterableOption label="Strip prefix" desc="Remove a fixed prefix if present." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.stripPrefix}
                        onChange={(v) => update("stripPrefix", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>

                    <ToggleRow busy={busy} checked={opts.stripPrefix} onToggle={(v) => update("stripPrefix", v)}>
                      <div className={FileExplorerStyles.cleanLabel}>Strip prefix</div>
                      <div className={FileExplorerStyles.cleanDesc}>Remove a fixed prefix if present.</div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle>
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Prefix</div>
                        <input
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          value={opts.prefixToStrip}
                          onChange={(e) => update("prefixToStrip", e.target.value)}
                          disabled={busy || !opts.stripPrefix}
                          placeholder="e.g. ID-"
                        />
                      </div>
                    </ToggleRow>
                  </div>
                </FilterableOption>

                <FilterableOption label="Strip suffix" desc="Remove a fixed suffix if present." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.stripSuffix}
                        onChange={(v) => update("stripSuffix", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>

                    <ToggleRow busy={busy} checked={opts.stripSuffix} onToggle={(v) => update("stripSuffix", v)}>
                      <div className={FileExplorerStyles.cleanLabel}>Strip suffix</div>
                      <div className={FileExplorerStyles.cleanDesc}>Remove a fixed suffix if present.</div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle>
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Suffix</div>
                        <input
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          value={opts.suffixToStrip}
                          onChange={(e) => update("suffixToStrip", e.target.value)}
                          disabled={busy || !opts.stripSuffix}
                          placeholder="e.g. _old"
                        />
                      </div>
                    </ToggleRow>
                  </div>
                </FilterableOption>

                <FilterableOption label="Pad values" desc="Pad strings to a minimum length." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.padValues}
                        onChange={(v) => update("padValues", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>

                    <ToggleRow busy={busy} checked={opts.padValues} onToggle={(v) => update("padValues", v)}>
                      <div className={FileExplorerStyles.cleanLabelRow}>
                        <div className={FileExplorerStyles.cleanLabel}>Pad values</div>
                        <span
                          className={`${FileExplorerStyles.cleanInlineHint} ${busy || !opts.padValues ? FileExplorerStyles.cleanInlineHintShow : FileExplorerStyles.cleanInlineHintHide
                            }`}
                          aria-hidden={!(busy || !opts.padValues)}
                        >
                          (Turn on to configure)
                        </span>
                      </div>

                      <div className={FileExplorerStyles.cleanDesc}>Pad strings to a minimum length.</div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle>
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Direction</div>
                        <select
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          value={opts.padDirection}
                          onChange={(e) => update("padDirection", e.target.value)}
                          disabled={busy || !opts.padValues}
                        >
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                        </select>
                      </div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle>
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Length</div>
                        <input
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          type="number"
                          min={1}
                          value={opts.padLength}
                          onChange={(e) => update("padLength", Number(e.target.value))}
                          disabled={busy || !opts.padValues}
                        />
                      </div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle>
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Character</div>
                        <input
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          value={opts.padCharacter}
                          onChange={(e) => update("padCharacter", e.target.value)}
                          disabled={busy || !opts.padValues}
                          placeholder="Single character"
                        />
                      </div>
                    </ToggleRow>
                  </div>
                </FilterableOption>
              </div>

              <div className={FileExplorerStyles.cleanSection}>
                <FilterableOption label="Convert data types" desc='Provide JSON map: column → type ("string","integer","float","boolean").' cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.convertDataTypes}
                        onChange={(v) => update("convertDataTypes", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>

                    <ToggleRow busy={busy} checked={opts.convertDataTypes} onToggle={(v) => update("convertDataTypes", v)}>
                      <div className={FileExplorerStyles.cleanLabelRow}>
                        <div className={FileExplorerStyles.cleanLabel}>Convert data types</div>
                        <span
                          className={`${FileExplorerStyles.cleanInlineHint} ${busy || !opts.convertDataTypes
                            ? FileExplorerStyles.cleanInlineHintShow
                            : FileExplorerStyles.cleanInlineHintHide
                            }`}
                          aria-hidden={!(busy || !opts.convertDataTypes)}
                        >
                          (Turn on to provide map)
                        </span>
                      </div>

                      <div className={FileExplorerStyles.cleanDesc}>
                        Provide JSON map: column → type (&quot;string&quot;,&quot;integer&quot;,&quot;float&quot;,&quot;boolean&quot;).
                      </div>

                      <JsonMapEditor
                        busy={busy}
                        enabled={opts.convertDataTypes}
                        label="Map"
                        description='Column → type ("string", "integer", "float", "boolean").'
                        valueText={typeConversionMapText}
                        onChangeText={setTypeConversionMapText}
                        allowEmpty={false}
                        examples={[
                          { name: "Basic", value: { age: "integer", price: "float", active: "boolean" } },
                          { name: "All strings", value: { id: "string", name: "string" } },
                        ]}
                      />
                    </ToggleRow>
                  </div>
                </FilterableOption>
              </div>

              <div className={FileExplorerStyles.cleanSection}>
                <FilterableOption label="Extract email domain" desc='Adds a "_domain" column when an email is found.' cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.extractEmailDomain}
                        onChange={(v) => update("extractEmailDomain", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>
                    <ToggleRow busy={busy} checked={opts.extractEmailDomain} onToggle={(v) => update("extractEmailDomain", v)}>
                      <div className={FileExplorerStyles.cleanLabel}>Extract email domain</div>
                      <div className={FileExplorerStyles.cleanDesc}>Adds a "_domain" column when an email is found.</div>
                    </ToggleRow>
                  </div>
                </FilterableOption>

                <FilterableOption label="Validate emails" desc='Blank out invalid email values (when containing "@").' cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.validateEmails}
                        onChange={(v) => update("validateEmails", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>
                    <ToggleRow busy={busy} checked={opts.validateEmails} onToggle={(v) => update("validateEmails", v)}>
                      <div className={FileExplorerStyles.cleanLabel}>Validate emails</div>
                      <div className={FileExplorerStyles.cleanDesc}>Blank out invalid email values (when containing "@").</div>
                    </ToggleRow>
                  </div>
                </FilterableOption>

                <FilterableOption label="Extract URL components" desc="Adds protocol/domain/path/query columns for URLs." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.extractURLComponents}
                        onChange={(v) => update("extractURLComponents", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>
                    <ToggleRow
                      busy={busy}
                      checked={opts.extractURLComponents}
                      onToggle={(v) => update("extractURLComponents", v)}
                    >
                      <div className={FileExplorerStyles.cleanLabel}>Extract URL components</div>
                      <div className={FileExplorerStyles.cleanDesc}>Adds protocol/domain/path/query columns for URLs.</div>
                    </ToggleRow>
                  </div>
                </FilterableOption>

                <FilterableOption label="Normalize URLs" desc="Lowercase http(s) URLs and remove trailing slash." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.normalizeURLs}
                        onChange={(v) => update("normalizeURLs", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>
                    <ToggleRow busy={busy} checked={opts.normalizeURLs} onToggle={(v) => update("normalizeURLs", v)}>
                      <div className={FileExplorerStyles.cleanLabel}>Normalize URLs</div>
                      <div className={FileExplorerStyles.cleanDesc}>Lowercase http(s) URLs and remove trailing slash.</div>
                    </ToggleRow>
                  </div>
                </FilterableOption>

                <FilterableOption label="Standardize phone numbers" desc="Normalize phone numbers into a consistent format." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.standardizePhoneNumbers}
                        onChange={(v) => update("standardizePhoneNumbers", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>
                    <ToggleRow
                      busy={busy}
                      checked={opts.standardizePhoneNumbers}
                      onToggle={(v) => update("standardizePhoneNumbers", v)}
                    >
                      <div className={FileExplorerStyles.cleanLabelRow}>
                        <div className={FileExplorerStyles.cleanLabel}>Standardize phone numbers</div>
                        <span
                          className={`${FileExplorerStyles.cleanInlineHint} ${busy || !opts.standardizePhoneNumbers
                            ? FileExplorerStyles.cleanInlineHintShow
                            : FileExplorerStyles.cleanInlineHintHide
                            }`}
                          aria-hidden={!(busy || !opts.standardizePhoneNumbers)}
                        >
                          (Turn on to configure)
                        </span>
                      </div>

                      <div className={FileExplorerStyles.cleanDesc}>Normalize phone numbers into a consistent format.</div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle>
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Format</div>
                        <select
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          value={opts.phoneFormat}
                          onChange={(e) => update("phoneFormat", e.target.value)}
                          disabled={busy || !opts.standardizePhoneNumbers}
                        >
                          <option value="national">National</option>
                          <option value="international">International</option>
                          <option value="e164">E.164</option>
                        </select>
                      </div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle>
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Default country code</div>
                        <input
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          value={opts.defaultCountryCode}
                          onChange={(e) => update("defaultCountryCode", e.target.value)}
                          disabled={busy || !opts.standardizePhoneNumbers}
                          placeholder="+1"
                        />
                      </div>
                    </ToggleRow>
                  </div>
                </FilterableOption>
              </div>

              <div className={FileExplorerStyles.cleanSection}>
                <FilterableOption label="Split column" desc="Split a column by delimiter into multiple columns." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.splitColumn}
                        onChange={(v) => update("splitColumn", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>

                    <ToggleRow busy={busy} checked={opts.splitColumn} onToggle={(v) => update("splitColumn", v)}>
                      <div className={FileExplorerStyles.cleanLabelRow}>
                        <div className={FileExplorerStyles.cleanLabel}>Split column</div>
                        <span
                          className={`${FileExplorerStyles.cleanInlineHint} ${busy || !opts.splitColumn
                            ? FileExplorerStyles.cleanInlineHintShow
                            : FileExplorerStyles.cleanInlineHintHide}`}
                          aria-hidden={!(busy || !opts.splitColumn)}
                        >
                          (Turn on to configure)
                        </span>
                      </div>

                      <div className={FileExplorerStyles.cleanDesc}>
                        Split a column by delimiter into multiple columns.
                      </div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle>
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Column</div>
                        <input
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          value={opts.columnToSplit}
                          onChange={(e) => update("columnToSplit", e.target.value)}
                          disabled={busy || !opts.splitColumn}
                        />
                      </div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle>
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Delimiter</div>
                        <input
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          value={opts.splitDelimiter}
                          onChange={(e) => update("splitDelimiter", e.target.value)}
                          disabled={busy || !opts.splitColumn}
                        />
                      </div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle>
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>New names</div>
                        <input
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          value={(opts.newColumnNames || []).join(",")}
                          onChange={(e) => update("newColumnNames", toList(e.target.value))}
                          disabled={busy || !opts.splitColumn}
                          placeholder="Optional: colA,colB"
                        />
                      </div>
                    </ToggleRow>
                  </div>
                </FilterableOption>

                <FilterableOption label="Merge columns" desc="Concatenate multiple columns into one." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.mergeColumns}
                        onChange={(v) => update("mergeColumns", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>

                    <ToggleRow busy={busy} checked={opts.mergeColumns} onToggle={(v) => update("mergeColumns", v)}>
                      <div className={FileExplorerStyles.cleanLabelRow}>
                        <div className={FileExplorerStyles.cleanLabel}>Merge columns</div>
                        <span
                          className={`${FileExplorerStyles.cleanInlineHint} ${busy || !opts.mergeColumns
                            ? FileExplorerStyles.cleanInlineHintShow
                            : FileExplorerStyles.cleanInlineHintHide}`}
                          aria-hidden={!(busy || !opts.mergeColumns)}
                        >
                          (Turn on to configure)
                        </span>
                      </div>

                      <div className={FileExplorerStyles.cleanDesc}>
                        Concatenate multiple columns into one.
                      </div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle>
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Columns</div>
                        <input
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          value={(opts.columnsToMerge || []).join(",")}
                          onChange={(e) => update("columnsToMerge", toList(e.target.value))}
                          disabled={busy || !opts.mergeColumns}
                          placeholder="colA,colB"
                        />
                      </div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle>
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Delimiter</div>
                        <input
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          value={opts.mergeDelimiter}
                          onChange={(e) => update("mergeDelimiter", e.target.value)}
                          disabled={busy || !opts.mergeColumns}
                        />
                      </div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle>
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>New column</div>
                        <input
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          value={opts.mergedColumnName}
                          onChange={(e) => update("mergedColumnName", e.target.value)}
                          disabled={busy || !opts.mergeColumns}
                        />
                      </div>
                    </ToggleRow>
                  </div>
                </FilterableOption>
              </div>

              <div className={FileExplorerStyles.cleanSection}>
                <FilterableOption label="Remove rows with pattern" desc="Remove rows where a column matches a regex." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.removeRowsWithPattern}
                        onChange={(v) => update("removeRowsWithPattern", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>

                    <ToggleRow
                      busy={busy}
                      checked={opts.removeRowsWithPattern}
                      onToggle={(v) => update("removeRowsWithPattern", v)}
                    >
                      <div className={FileExplorerStyles.cleanLabelRow}>
                        <div className={FileExplorerStyles.cleanLabel}>Remove rows with pattern</div>
                      </div>

                      <div className={FileExplorerStyles.cleanDesc}>
                        Remove rows where a column matches a regex.
                      </div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle>
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Column</div>
                        <input
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          value={opts.rowFilterColumn}
                          onChange={(e) => update("rowFilterColumn", e.target.value)}
                          disabled={busy || !opts.removeRowsWithPattern}
                        />
                      </div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle  >
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Regex</div>
                        <input
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          value={opts.rowFilterPattern}
                          onChange={(e) => update("rowFilterPattern", e.target.value)}
                          disabled={busy || !opts.removeRowsWithPattern}
                          placeholder="e.g. ^(test|dummy)$"
                        />
                      </div>
                    </ToggleRow>
                  </div>
                </FilterableOption>
              </div>

              <div className={FileExplorerStyles.cleanSection}>
                <FilterableOption label="Normalize data (min-max)" desc="Scale values to [0,1] per selected column." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.normalizeData}
                        onChange={(v) => update("normalizeData", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>

                    <ToggleRow busy={busy} checked={opts.normalizeData} onToggle={(v) => update("normalizeData", v)}>
                      <div className={FileExplorerStyles.cleanLabel}>Normalize data (min-max)</div>
                      <div className={FileExplorerStyles.cleanDesc}>
                        Scale values to [0,1] per selected column.
                      </div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle  >
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Columns</div>
                        <input
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          value={(opts.normalizeColumns || []).join(",")}
                          onChange={(e) => update("normalizeColumns", toList(e.target.value))}
                          disabled={busy || !opts.normalizeData}
                          placeholder="colA,colB"
                        />
                      </div>
                    </ToggleRow>
                  </div>
                </FilterableOption>
              </div>

              <div className={FileExplorerStyles.cleanSection}>
                <FilterableOption label="Merge similar values" desc="Fuzzy-merge similar strings using a similarity threshold." cleanSearchNorm={cleanSearchNorm}>
                  <div className={FileExplorerStyles.cleanRow}>
                    <div className={FileExplorerStyles.cleanSwitchCol}>
                      <Switch
                        checked={opts.mergeSimilarValues}
                        onChange={(v) => update("mergeSimilarValues", v)}
                        height={20}
                        width={40}
                        handleDiameter={16}
                        offColor="#888"
                        onColor="#9ABDDC"
                        disabled={busy}
                      />
                    </div>

                    <ToggleRow
                      busy={busy}
                      checked={opts.mergeSimilarValues}
                      onToggle={(v) => update("mergeSimilarValues", v)}
                    >
                      <div className={FileExplorerStyles.cleanLabelRow}>
                        <div className={FileExplorerStyles.cleanLabel}>Merge similar values</div>
                      </div>

                      <div className={FileExplorerStyles.cleanDesc}>
                        Fuzzy-merge similar strings using a similarity threshold.
                      </div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle  >
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Columns</div>
                        <input
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          value={(opts.fuzzyMatchColumns || []).join(",")}
                          onChange={(e) => update("fuzzyMatchColumns", toList(e.target.value))}
                          disabled={busy || !opts.mergeSimilarValues}
                          placeholder="colA,colB"
                        />
                      </div>

                      <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle  >
                        <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>Threshold</div>
                        <input
                          className={FileExplorerStyles.cleanControl} data-no-row-toggle
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          value={opts.mergeSimilarityThreshold}
                          onChange={(e) => update("mergeSimilarityThreshold", Number(e.target.value))}
                          disabled={busy || !opts.mergeSimilarValues}
                        />
                      </div>
                    </ToggleRow>
                  </div>
                </FilterableOption>
              </div>
            </>
          )}
        </div>
      </VisibleCountContext.Provider>

      <div className={FileExplorerStyles.cleanFooter}>
        <div className={FileExplorerStyles.cleanFooterLeft}>
          {selectedCount === 1
            ? `Applying to the selected file, ${enabledLabel}`
            : `Applying to the selected ${selectedCount} files, ${enabledLabel}`}
        </div>

        <div className={FileExplorerStyles.cleanFooterRight}>
          <button className={FileExplorerStyles.cleanCancel} onClick={onClose} disabled={busy} type="button">
            Cancel
          </button>

          <button
            className={FileExplorerStyles.cleanApply}
            onClick={handleApply}
            disabled={busy || selectedCount === 0 || enabledCount === 0}
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
