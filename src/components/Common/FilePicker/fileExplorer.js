import React, { useEffect, useMemo, useRef, useState } from "react";
import { CSSTransition } from "react-transition-group";
import Switch from "react-switch";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import RefreshIcon from "@mui/icons-material/Refresh";
import Styles from "./fileExplorer.module.css";
import { listExplorerFiles, renameExplorerFile, deleteExplorerFile, cleanExplorerFile } from "../../../util/petitionHandler";

function FileExplorer({ category, isOpen = true, onClose, onOpenFile }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // selection (multi)
  const [selected, setSelected] = useState(() => new Set());
  const [lastIndex, setLastIndex] = useState(null);

  // “long click” multi-select mode (click toggles without Ctrl)
  const [multiMode, setMultiMode] = useState(false);
  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);
  const LONG_PRESS_MS = 380;

  // inline rename (in-row)
  const [renamingName, setRenamingName] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const renameInputRef = useRef(null);

  // slide-open list animation
  const [filesLoaded, setFilesLoaded] = useState(false);
  const [listHeight, setListHeight] = useState(0);
  const listWrapRef = useRef(null);
  const modalNodeRef = useRef(null);

  // clean side panel
  const [showCleanPanel, setShowCleanPanel] = useState(false);

  // clean options (UI-only currently; placeholder endpoint is still per file)
  const [removeDuplicates, setRemoveDuplicates] = useState(false);
  const [removeEmptyRows, setRemoveEmptyRows] = useState(false);
  const [standardizeDates, setStandardizeDates] = useState(false);
  const [selectedDateFormat, setSelectedDateFormat] = useState("YYYY-MM-DD");
  const [standardizeNumeric, setStandardizeNumeric] = useState(false);
  const [numericMode, setNumericMode] = useState("double");

  // delete confirmation (no alerts)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const NEW_WINDOW_MS = 60_000;

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

  const sorted = useMemo(() => {
    return [...files].sort((a, b) =>
      String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" })
    );
  }, [files]);

  const hasSelection = selected.size > 0;

  const isNew = (f) => {
    const created = Number(f.createdAtMs) || 0;
    if (!created) return false;
    return Date.now() - created < NEW_WINDOW_MS;
  };

  const extOf = (name) => {
    const m = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : "";
  };

  const formatBytes = (bytes) => {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n < 0) return "—";
    if (n < 1024) return `${n} B`;
    const units = ["KB", "MB", "GB", "TB"];
    let v = n / 1024;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i += 1;
    }
    return `${v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0)} ${units[i]}`;
  };

  const formatDateTime = (ms) => {
    const t = Number(ms);
    if (!Number.isFinite(t) || t <= 0) return "—";
    return new Date(t).toLocaleString();
  };

  const clampSelectionToExisting = (nextFiles) => {
    const names = new Set(nextFiles.map((f) => f.name));
    setSelected((prev) => {
      const next = new Set();
      for (const n of prev) if (names.has(n)) next.add(n);
      return next;
    });
  };

  const load = async () => {
    setLoading(true);
    setBusy(false);
    setError(null);
    setFilesLoaded(false);

    setShowCleanPanel(false);
    setRenamingName(null);
    setShowDeleteConfirm(false);

    try {
      const data = await listExplorerFiles(category);
      const list = Array.isArray(data) ? data : [];
      setFiles(list);
      clampSelectionToExisting(list);

      setTimeout(() => setFilesLoaded(true), 40);
    } catch (e) {
      setError(e?.message || "Failed to load files");
      setFiles([]);
      setSelected(new Set());
      setFilesLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, category]);

  // focus rename input when it appears
  useEffect(() => {
    if (renamingName && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingName]);

  // list height animation
  useEffect(() => {
    if (!filesLoaded || !listWrapRef.current) return;
    const el = listWrapRef.current;
    requestAnimationFrame(() => {
      const h = el.scrollHeight;
      setListHeight(h);
      setTimeout(() => setListHeight("auto"), 260);
    });
  }, [filesLoaded, sorted.length]);

  // keyboard shortcuts (Windows-ish)
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (busy) return;

      const tag = String(e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") return;

      // IMPORTANT: while renaming, Enter/Escape should only affect rename, not open.
      if (renamingName) {
        if (e.key === "Escape") {
          e.preventDefault();
          cancelRename();
        }
        return;
      }

      if (e.key === "F2") {
        e.preventDefault();
        startRename();
      } else if (e.key === "Enter") {
        if (selected.size === 1) {
          const only = Array.from(selected)[0];
          doOpen(only);
        }
      } else if (e.key === "Delete") {
        if (selected.size > 0) {
          e.preventDefault();
          setShowDeleteConfirm(true);
        }
      } else if (e.key === "Escape") {
        setShowCleanPanel(false);
        setShowDeleteConfirm(false);
        setMultiMode(false);
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [isOpen, busy, selected, renamingName]);

  const setSingle = (name, idx) => {
    setSelected(new Set([name]));
    setLastIndex(idx);
  };

  const toggle = (name, idx) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
    setLastIndex(idx);
  };

  const addRange = (idx) => {
    if (lastIndex == null) {
      const name = sorted[idx]?.name;
      if (name) setSelected(new Set([name]));
      setLastIndex(idx);
      return;
    }
    const start = Math.min(lastIndex, idx);
    const end = Math.max(lastIndex, idx);
    setSelected((prev) => {
      const next = new Set(prev);
      for (let i = start; i <= end; i++) {
        const n = sorted[i]?.name;
        if (n) next.add(n);
      }
      return next;
    });
  };

  const onRowClick = (e, name, idx) => {
    if (busy) return;
    setError(null);

    if (renamingName && renamingName !== name) cancelRename();

    const isShift = e.shiftKey;
    const isCtrl = e.ctrlKey || e.metaKey;

    if (isShift) {
      addRange(idx);
      return;
    }

    // multiMode = “after long click”: normal click toggles selection
    if (multiMode || isCtrl) {
      toggle(name, idx);
      return;
    }

    setSingle(name, idx);
  };

  const onRowDoubleClick = (name) => {
    if (busy) return;
    if (renamingName) return; // avoid double-click open while editing
    doOpen(name);
  };

  const startRename = () => {
    if (busy) return;
    if (selected.size !== 1) return;
    const only = Array.from(selected)[0];
    setRenamingName(only);
    setRenameDraft(only);
    setError(null);
  };

  const cancelRename = () => {
    setRenamingName(null);
    setRenameDraft("");
  };

  const commitRename = async () => {
    if (busy) return;
    if (!renamingName) return;

    const from = renamingName;
    const to = String(renameDraft || "").trim();

    if (!to || to === from) {
      cancelRename();
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await renameExplorerFile(category, from, to);
      setSelected(new Set([to]));
      setRenamingName(null);
      setRenameDraft("");
      await load();
    } catch (e) {
      setError(e?.message || "Rename failed");
      // keep edit mode open so user can fix it
    } finally {
      setBusy(false);
    }
  };

  const requestDelete = () => {
    if (!hasSelection || busy) return;
    setShowDeleteConfirm(true);
  };

  const doDeleteConfirmed = async () => {
    if (busy) return;
    if (selected.size === 0) return;

    setBusy(true);
    setError(null);
    try {
      const names = Array.from(selected);
      for (const n of names) {
        // eslint-disable-next-line no-await-in-loop
        await deleteExplorerFile(category, n);
      }
      setSelected(new Set());
      setShowDeleteConfirm(false);
      await load();
    } catch (e) {
      setError(e?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const doOpen = (name) => {
    if (busy) return;
    if (!onOpenFile) return;
    onOpenFile(name);
  };

  const doOpenSelected = () => {
    if (busy) return;
    if (!onOpenFile) return;
    if (selected.size === 0) return;

    // open “primary” selection: lastIndex if included, else first selected
    let target = null;
    if (lastIndex != null && sorted[lastIndex] && selected.has(sorted[lastIndex].name)) {
      target = sorted[lastIndex].name;
    } else {
      target = Array.from(selected)[0];
    }
    if (target) onOpenFile(target);
  };

  const openCleanPanel = () => {
    if (busy) return;
    if (!hasSelection) return;
    setShowCleanPanel(true);
  };

  const applyClean = async () => {
    if (busy) return;
    if (selected.size === 0) return;

    setBusy(true);
    setError(null);
    try {
      const names = Array.from(selected);
      for (const n of names) {
        // eslint-disable-next-line no-await-in-loop
        await cleanExplorerFile(category, n);
      }
      setShowCleanPanel(false);
    } catch (e) {
      setError(e?.message || "Clean failed");
    } finally {
      setBusy(false);
    }
  };

  // long-press to enable multiMode
  const onRowMouseDown = (name, idx) => {
    if (busy) return;

    longPressFired.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);

    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setMultiMode(true);

      // ensure the pressed row is included (toggle like Windows multi-select intent)
      setSelected((prev) => {
        const next = new Set(prev);
        if (!next.has(name)) next.add(name);
        return next;
      });
      setLastIndex(idx);
    }, LONG_PRESS_MS);
  };

  const onRowMouseUp = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const onRowMouseLeave = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const FileTypeIcon = ({ name }) => {
    const ext = extOf(name);
    const isXlsx = ext === "xlsx" || ext === "xls";
    const label = isXlsx ? "XLSX" : "CSV";
    const cls = isXlsx ? Styles.iconXlsx : Styles.iconCsv;

    return (
      <span className={`${Styles.fileIcon} ${cls}`} aria-hidden="true" title={label}>
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path
            d="M7 2h7l5 5v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
            fill="currentColor"
            opacity="0.14"
          />
          <path
            d="M14 2v5h5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />
          <path
            d="M8 13h8M8 16h8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            opacity="0.9"
          />
          <text x="12" y="11.1" textAnchor="middle" fontSize="6" fontWeight="800" fill="currentColor">
            {label}
          </text>
        </svg>
      </span>
    );
  };

  const toolbarDisabled = busy || loading;

  return (
    <CSSTransition
      in={isOpen}
      timeout={320}
      appear
      nodeRef={modalNodeRef}
      classNames={{
        enter: Styles.fadeModalEnter,
        enterActive: Styles.fadeModalEnterActive,
        exit: Styles.fadeModalExit,
        exitActive: Styles.fadeModalExitActive,
      }}
      unmountOnExit
    >
      <div ref={modalNodeRef} className={Styles.modalBackground}>
        <div className={Styles.modalContainer}>
          <div className={Styles.toolbar}>
            {/* left: action buttons */}
            <div className={Styles.toolbarGroup}>
              <button
                className={Styles.tbBtn}
                onClick={doOpenSelected}
                disabled={toolbarDisabled || !hasSelection || !onOpenFile || !!renamingName}
                title="Open (Enter / double-click)"
              >
                Open
              </button>

              <button
                className={Styles.tbBtn}
                onClick={startRename}
                disabled={toolbarDisabled || selected.size !== 1}
                title="Rename (F2)"
              >
                Rename
              </button>

              <button
                className={Styles.tbBtn}
                onClick={openCleanPanel}
                disabled={toolbarDisabled || !hasSelection}
                title="Data cleaning"
              >
                Data cleaning
              </button>

              <button
                className={`${Styles.tbBtn} ${Styles.tbDanger}`}
                onClick={requestDelete}
                disabled={toolbarDisabled || !hasSelection}
                title="Delete (Del)"
              >
                Delete
              </button>

              <span className={Styles.toolbarMeta}>
                <span className={Styles.selPill} title="Selected">
                  {selected.size} selected
                </span>
                {multiMode ? (
                  <button
                    className={Styles.pillBtn}
                    type="button"
                    onClick={() => setMultiMode(false)}
                    disabled={busy}
                    title="Exit multi-select mode"
                  >
                    Multi
                  </button>
                ) : null}
              </span>
            </div>

            {/* right: refresh icon + optional close */}
            <div className={Styles.toolbarGroup}>
              <IconButton
                className={Styles.refreshIconBtn}
                onClick={load}
                disabled={toolbarDisabled}
                aria-label="Refresh"
                title="Refresh"
                size="small"
              >
                <RefreshIcon fontSize="small" />
              </IconButton>

              {onClose ? (
                <button className={Styles.tbBtn} onClick={onClose} disabled={busy} title="Close">
                  Close
                </button>
              ) : null}
            </div>
          </div>


          <div className={Styles.contentShell}>
            {/* File table (slides open after load) */}
            <CSSTransition in={filesLoaded} timeout={260} unmountOnExit classNames="">
              <div
                ref={listWrapRef}
                className={Styles.tableWrap}
                style={{
                  height: listHeight,
                  overflow: listHeight === "auto" ? "auto" : "hidden",
                  transition: "height 260ms ease",
                }}
              >
                {loading ? (
                  <div className={Styles.emptyState}>Loading…</div>
                ) : sorted.length === 0 ? (
                  <div className={Styles.emptyState}>No files available</div>
                ) : (
                  <div className={Styles.table}>
                    <div className={Styles.headerRow}>
                      <div className={Styles.colName}>Name</div>
                      <div className={Styles.colSize}>Size</div>
                      <div className={Styles.colCreated}>Created</div>
                      <div className={Styles.colModified}>Modified</div>
                    </div>

                    {sorted.map((f, idx) => {
                      const isSelected = selected.has(f.name);

                      return (
                        <div
                          key={f.name}
                          className={`${Styles.row} ${isSelected ? Styles.rowSelected : ""} ${busy ? Styles.rowDisabled : ""
                            }`}
                          onMouseDown={() => onRowMouseDown(f.name, idx)}
                          onMouseUp={onRowMouseUp}
                          onMouseLeave={onRowMouseLeave}
                          onClick={(e) => {
                            // if long press already fired, avoid immediately flipping selection again
                            if (longPressFired.current) return;
                            onRowClick(e, f.name, idx);
                          }}
                          onDoubleClick={() => onRowDoubleClick(f.name)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            // Enter while focused on row should open ONLY if not renaming
                            if (e.key === "Enter" && !renamingName) onRowDoubleClick(f.name);
                          }}
                          title="Click to select • Long-click for multi • Ctrl/⌘ toggles • Shift range • Double-click opens"
                        >
                          <div className={Styles.colName}>
                            <FileTypeIcon name={f.name} />

                            {renamingName === f.name ? (
                              <input
                                ref={renameInputRef}
                                className={Styles.renameInline}
                                value={renameDraft}
                                onChange={(e) => setRenameDraft(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    commitRename();
                                  }
                                  if (e.key === "Escape") {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    cancelRename();
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onDoubleClick={(e) => e.stopPropagation()}
                                onBlur={() => commitRename()}
                                disabled={busy}
                              />
                            ) : (
                              <span className={Styles.nameText}>
                                {f.name}
                                {isNew(f) ? <span className={Styles.newMark}> *</span> : null}
                              </span>
                            )}
                          </div>

                          <div className={Styles.colSize}>{formatBytes(f.sizeBytes)}</div>
                          <div className={Styles.colCreated}>{formatDateTime(f.createdAtMs)}</div>
                          <div className={Styles.colModified}>{formatDateTime(f.lastModifiedAtMs)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CSSTransition>

            <CSSTransition
              in={showCleanPanel}
              timeout={260}
              classNames={{
                enter: Styles.cleanEnter,
                enterActive: Styles.cleanEnterActive,
                exit: Styles.cleanExit,
                exitActive: Styles.cleanExitActive,
              }}
              unmountOnExit
            >
              <div
                className={Styles.cleanOverlay}
                onMouseDown={() => !busy && setShowCleanPanel(false)}
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
                    onClick={() => setShowCleanPanel(false)}
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
                      Applies to <b>{selected.size}</b>
                    </div>

                    <div className={Styles.cleanFooterRight}>
                      <button
                        className={Styles.cleanApply}
                        onClick={applyClean}
                        disabled={busy || selected.size === 0}
                        title="Apply cleaning to selected files"
                      >
                        Apply
                      </button>
                      <button
                        className={Styles.cleanCancel}
                        onClick={() => setShowCleanPanel(false)}
                        disabled={busy}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </CSSTransition>

          </div>

          {error ? <div className={Styles.errorLine}>{error}</div> : null}
          <CSSTransition
            in={showDeleteConfirm}
            timeout={180}
            unmountOnExit
            classNames={{
              enter: Styles.confirmEnter,
              enterActive: Styles.confirmEnterActive,
              exit: Styles.confirmExit,
              exitActive: Styles.confirmExitActive,
            }}
          >
            <div
              className={Styles.confirmOverlay}
              onMouseDown={() => !busy && setShowDeleteConfirm(false)}
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
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={busy}
                  aria-label="Close"
                  size="small"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>

                <div className={Styles.confirmHeader}>
                  <div className={Styles.confirmTitle}>Delete</div>
                  <div className={Styles.confirmText}>
                    Delete {selected.size} file{selected.size === 1 ? "" : "s"}?
                  </div>
                </div>

                <div className={Styles.confirmActions}>
                  <button
                    className={Styles.confirmCancelBtn}
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={busy}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className={Styles.confirmDeleteBtn}
                    onClick={doDeleteConfirmed}
                    disabled={busy}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </CSSTransition>
        </div>
      </div>
    </CSSTransition>
  );
}

export default FileExplorer;
