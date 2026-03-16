// jsonMapEditor.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseJsonObject } from "../../../util/parser";
import FileExplorerStyles from "./fileExplorer.module.css";

/**
 * JsonMapEditor
 *
 * Requirements implemented:
 * - No prefill/template/example buttons (examples prop ignored on purpose).
 * - Only optional one-time initialization when enabling and map is empty:
 *   - Uses `defaultValue` if provided, otherwise `{}`.
 * - When disabled: hide Key/Value headers + rows, show a quiet placeholder line only.
 * - JSON <pre> renders under the Map field label (left column) and is always pretty-printed from parsed value.
 * - Uses existing clean* styles + adds small new module classes for the mapper (below).
 */
function JsonMapEditor({
  busy,
  enabled,
  label,
  description,
  valueText,
  onChangeText,
  allowEmpty = false,
  // optional: common schema initialization when first enabled and empty
  defaultValue,
  // keep signature compatible, but never render any example UI
  examples = [],
}) {
  const disabled = busy || !enabled;

  // Table vs Raw JSON view
  const [mode, setMode] = useState("table");

  // One-time init guard per enable-session
  const didInitRef = useRef(false);

  const parsed = useMemo(() => {
    if (!enabled) return { ok: true, value: {} };
    return parseJsonObject(valueText, { fallback: {}, allowEmpty });
  }, [enabled, valueText, allowEmpty]);

  const entries = useMemo(() => {
    if (!parsed.ok) return [];
    return Object.entries(parsed.value || {});
  }, [parsed]);

  const errorText = useMemo(() => {
    if (!enabled) return "";
    if (parsed.ok) return "";
    if (parsed.error?.message === "Not a JSON object") return 'Must be a JSON object, e.g. {"old":"new"}.';
    if (parsed.error?.message === "Empty JSON") return "Cannot be empty.";
    return "Invalid JSON.";
  }, [enabled, parsed]);

  const setObject = useCallback(
    (obj) => {
      onChangeText(JSON.stringify(obj, null, 2));
    },
    [onChangeText]
  );

  // One-time default initialization when user turns the step on and the map is empty
  useEffect(() => {
    if (!enabled) {
      didInitRef.current = false;
      return;
    }
    if (didInitRef.current) return;

    // Only initialize if current text is effectively empty-object-ish or empty string
    const raw = String(valueText || "").trim();
    const isEmptyText = raw === "" || raw === "{}";

    // Also treat "parsed ok but no entries" as empty.
    const isEmptyObj = parsed.ok && Object.keys(parsed.value || {}).length === 0;

    if (isEmptyText || isEmptyObj) {
      const init = defaultValue && typeof defaultValue === "object" ? defaultValue : {};
      // Only set if there is something meaningful or if user gave empty string (normalize).
      setObject(init);
      // keep table view
      setMode("table");
    }

    didInitRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]); // intentionally only keyed on enabled; parsed/valueText can fluctuate while typing

  const addRow = useCallback(() => {
    const current = parsed.ok ? { ...(parsed.value || {}) } : {};
    let k = "key";
    let i = 1;
    while (Object.prototype.hasOwnProperty.call(current, k)) k = `key_${i++}`;
    current[k] = "";
    setObject(current);
  }, [parsed, setObject]);

  const removeRow = useCallback(
    (idx) => {
      if (!parsed.ok) return;
      const rows = Object.entries(parsed.value || {});
      const [k] = rows[idx] || [];
      if (!k) return;
      const next = { ...(parsed.value || {}) };
      delete next[k];
      setObject(next);
    },
    [parsed, setObject]
  );

  const clearAll = useCallback(() => setObject({}), [setObject]);

  const formatJson = useCallback(() => {
    if (!parsed.ok) return;
    setObject(parsed.value || {});
  }, [parsed, setObject]);

  // Rename key safely without losing order too badly
  const renameKeyAtIndex = useCallback(
    (idx, nextKeyRaw) => {
      if (!parsed.ok) return;
      const rows = Object.entries(parsed.value || {});
      const [oldKey, oldVal] = rows[idx] || [];
      if (oldKey == null) return;

      const nextKey = String(nextKeyRaw ?? "").trim();
      const next = { ...(parsed.value || {}) };

      // if key unchanged, no-op
      if (nextKey === oldKey) return;

      // remove old
      delete next[oldKey];

      // if blank, just remove
      if (!nextKey) {
        setObject(next);
        return;
      }

      // if collides, overwrite (consistent with object semantics)
      next[nextKey] = oldVal;
      setObject(next);
    },
    [parsed, setObject]
  );

  const setValueAtIndex = useCallback(
    (idx, nextValue) => {
      if (!parsed.ok) return;
      const rows = Object.entries(parsed.value || {});
      const [k] = rows[idx] || [];
      if (!k) return;
      const next = { ...(parsed.value || {}) };
      next[k] = nextValue;
      setObject(next);
    },
    [parsed, setObject]
  );

  const canFormat = !disabled && parsed.ok;

  // Pretty preview should always be a clean JSON object; if invalid, show nothing.
  const previewText = useMemo(() => {
    if (!parsed.ok) return "";
    return JSON.stringify(parsed.value || {}, null, 2);
  }, [parsed]);

  const showEditor = enabled; // show placeholder only when disabled; editor area opens when enabled
  const showTable = showEditor && mode === "table";
  const showRaw = showEditor && mode === "raw";

  return (
    <div className={FileExplorerStyles.cleanFieldRow} data-no-row-toggle>
      {/* Left column: Label + JSON preview under it */}
      <div className={FileExplorerStyles.cleanFieldLabel} data-no-row-toggle>
        <div data-no-row-toggle>{label}</div>

        {/* JSON preview appears under the label (left column) */}
        {enabled && parsed.ok && (
          <pre className={FileExplorerStyles.jsonMapPreview} data-no-row-toggle>
            {previewText}
          </pre>
        )}
      </div>

      {/* Right column: controls + content */}
      <div className={FileExplorerStyles.jsonMapRightColumn} data-no-row-toggle>
        {/* Top line: description + inline controls */}
        <div className={FileExplorerStyles.jsonMapTop} data-no-row-toggle>
          <div className={FileExplorerStyles.jsonMapMeta} data-no-row-toggle>
            <div className={FileExplorerStyles.jsonMapDesc} data-no-row-toggle>
              {description}
            </div>

            {!disabled && !parsed.ok && (
              <div className={FileExplorerStyles.jsonMapError} data-no-row-toggle>
                {errorText}
              </div>
            )}

            {!disabled && parsed.ok && (
              <div className={FileExplorerStyles.jsonMapCount} data-no-row-toggle>
                {entries.length} {entries.length === 1 ? "entry" : "entries"}
              </div>
            )}

            {disabled && (
              <div className={FileExplorerStyles.jsonMapMuted} data-no-row-toggle>
                Turn on to edit the map.
              </div>
            )}
          </div>

          <div className={FileExplorerStyles.jsonMapActions} data-no-row-toggle>
            <select
              className={`${FileExplorerStyles.cleanControl} ${FileExplorerStyles.jsonMapModeSelect}`}
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              disabled={disabled}
              data-no-row-toggle
              aria-label="Map editor view"
            >
              <option value="table">Table</option>
              <option value="raw">JSON</option>
            </select>

            <button
              type="button"
              className={FileExplorerStyles.cleanCancel}
              onClick={formatJson}
              disabled={!canFormat}
              data-no-row-toggle
              title="Format JSON"
            >
              Format
            </button>

            <button
              type="button"
              className={FileExplorerStyles.cleanCancel}
              onClick={clearAll}
              disabled={disabled}
              data-no-row-toggle
              title="Clear map"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Body */}
        <div className={FileExplorerStyles.jsonMapBody} data-no-row-toggle>
          {!showEditor ? null : showRaw ? (
            <textarea
              className={`${FileExplorerStyles.cleanControl} ${FileExplorerStyles.jsonMapTextarea}`}
              value={valueText}
              onChange={(e) => onChangeText(e.target.value)}
              disabled={disabled}
              data-no-row-toggle
              placeholder='{\n  "column": "string"\n}'
            />
          ) : showTable ? (
            <div className={FileExplorerStyles.jsonMapTable} data-no-row-toggle>
              {/* Hide Key/Value labels unless enabled (requirement) */}
              {enabled && (
                <div className={FileExplorerStyles.jsonMapHeaderRow} data-no-row-toggle>
                  <div className={FileExplorerStyles.jsonMapHeaderCell} data-no-row-toggle>
                    Key
                  </div>
                  <div className={FileExplorerStyles.jsonMapHeaderCell} data-no-row-toggle>
                    Value
                  </div>
                  <div />
                </div>
              )}

              {parsed.ok && entries.length > 0 ? (
                entries.map(([k, v], idx) => (
                  <div key={`${k}-${idx}`} className={FileExplorerStyles.jsonMapRow} data-no-row-toggle>
                    <input
                      className={FileExplorerStyles.cleanControl}
                      value={k}
                      onChange={(e) => renameKeyAtIndex(idx, e.target.value)}
                      disabled={disabled}
                      data-no-row-toggle
                      placeholder="column_name"
                    />

                    <input
                      className={FileExplorerStyles.cleanControl}
                      value={typeof v === "string" ? v : JSON.stringify(v)}
                      onChange={(e) => setValueAtIndex(idx, e.target.value)}
                      disabled={disabled}
                      data-no-row-toggle
                      placeholder="value"
                    />

                    <button
                      type="button"
                      className={FileExplorerStyles.jsonMapIconBtn}
                      onClick={() => removeRow(idx)}
                      disabled={disabled}
                      data-no-row-toggle
                      aria-label="Remove entry"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))
              ) : (
                <div className={FileExplorerStyles.jsonMapEmpty} data-no-row-toggle>
                  No entries yet.
                </div>
              )}

              <div className={FileExplorerStyles.jsonMapFooter} data-no-row-toggle>
                <button
                  type="button"
                  className={FileExplorerStyles.cleanApply}
                  onClick={addRow}
                  disabled={disabled}
                  data-no-row-toggle
                >
                  + Add entry
                </button>

                {!parsed.ok && (
                  <button
                    type="button"
                    className={FileExplorerStyles.cleanCancel}
                    onClick={() => onChangeText("{}")}
                    disabled={disabled}
                    data-no-row-toggle
                    title="Reset to empty object"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default JsonMapEditor;
