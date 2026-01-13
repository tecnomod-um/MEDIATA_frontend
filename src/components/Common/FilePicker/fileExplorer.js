import React, { useEffect, useMemo, useRef, useState } from "react";
import { CSSTransition } from "react-transition-group";
import Styles from "./fileExplorer.module.css";
import { listExplorerFiles, renameExplorerFile, deleteExplorerFile, cleanExplorerFile, processSelectedDatasets, getProcessSelectedDatasetsStatus, getProcessSelectedDatasetsResult } from "../../../util/petitionHandler";
import Toolbar from "./FileExplorer/Toolbar";
import FileTable from "./FileExplorer/FileTable";
import CleanPanel from "./FileExplorer/CleanPanel";
import DeleteConfirmation from "./FileExplorer/DeleteConfirmation";
import { formatBytes, formatDateTime, isFileNew } from "./FileExplorer/fileUtils";

function FileExplorer({ nodes = [], category, isOpen = true, onClose, onOpenFile, onFilesOpened }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Track files currently being processed (for showing loaders)
  const [processingFiles, setProcessingFiles] = useState(() => new Set());
  
  // Progress tracking for async operations (large files)
  const [progressMode, setProgressMode] = useState("spinner"); // "spinner" or "bar"
  const [progressValue, setProgressValue] = useState(0); // 0-100 for bar mode

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

  // Use shared utility function for isNew
  const isNew = (f) => isFileNew(f, NEW_WINDOW_MS);

  const clampSelectionToExisting = (nextFiles) => {
    const names = new Set(nextFiles.map((f) => f.name));
    setSelected((prev) => {
      const next = new Set();
      for (const n of prev) if (names.has(n)) next.add(n);
      return next;
    });
  };

  const load = async (isReload = false) => {
    setLoading(true);
    setBusy(false);
    setError(null);
    // Only collapse on initial load, not on reload
    if (!isReload) {
      setFilesLoaded(false);
    }

    setShowCleanPanel(false);
    setRenamingName(null);
    setShowDeleteConfirm(false);

    try {
      const data = await listExplorerFiles(category);
      const list = Array.isArray(data) ? data : [];
      setFiles(list);
      clampSelectionToExisting(list);

      // Slight delay for smooth transition
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      await load(true);
    } catch (e) {
      setError(e?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const pollFileOpenJob = async (jobId, onProgress) => {
    while (true) {
      const status = await getProcessSelectedDatasetsStatus(jobId);
      if (typeof status?.percent === "number") {
        onProgress(status.percent);
      }

      const state = String(status?.state || "").toUpperCase();
      if (state === "DONE") {
        const results = await getProcessSelectedDatasetsResult(jobId);
        return results || [];
      }
      if (state === "ERROR") {
        throw new Error(status.message || "File processing failed");
      }

      await sleep(500);
    }
  };

  const doOpen = async (name) => {
    if (busy) return;
    
    // If old callback exists and no new one, use legacy mode
    if (onOpenFile && !onFilesOpened) {
      setProcessingFiles(prev => new Set([...prev, name]));
      setBusy(true);
      onOpenFile(name);
      setTimeout(() => {
        setProcessingFiles(prev => {
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
        setBusy(false);
      }, 1500);
      return;
    }

    // New async mode with progress tracking
    if (!onFilesOpened) return;

    setBusy(true);
    setError(null);
    setProcessingFiles(new Set([name]));
    setProgressMode("spinner");
    setProgressValue(0);

    try {
      // Call backend API to process file
      const result = await processSelectedDatasets([name]);

      if (result.mode === "sync") {
        // Small file - quick processing
        const results = result.results || [];
        if (onFilesOpened) onFilesOpened(results);
      } else if (result.mode === "async") {
        // Large file - show progress bar
        setProgressMode("bar");
        
        const results = await pollFileOpenJob(result.jobId, (percent) => {
          setProgressValue(percent);
        });
        
        if (onFilesOpened) onFilesOpened(results);
      }
    } catch (e) {
      setError(e?.message || "Failed to open file");
    } finally {
      setProcessingFiles(new Set());
      setBusy(false);
      setProgressMode("spinner");
      setProgressValue(0);
    }
  };

  const doOpenSelected = async () => {
    if (busy) return;
    if (selected.size === 0) return;

    // open "primary" selection: lastIndex if included, else first selected
    let target = null;
    if (lastIndex != null && sorted[lastIndex] && selected.has(sorted[lastIndex].name)) {
      target = sorted[lastIndex].name;
    } else {
      target = Array.from(selected)[0];
    }
    
    if (!target) return;

    // If old callback exists and no new one, use legacy mode
    if (onOpenFile && !onFilesOpened) {
      setProcessingFiles(new Set([target]));
      setBusy(true);
      onOpenFile(target);
      setTimeout(() => {
        setProcessingFiles(new Set());
        setBusy(false);
      }, 1500);
      return;
    }

    // New async mode
    await doOpen(target);
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
    setProcessingFiles(new Set());
    
    try {
      const names = Array.from(selected);
      for (const n of names) {
        // Mark this file as processing
        setProcessingFiles(prev => new Set([...prev, n]));
        
        // eslint-disable-next-line no-await-in-loop
        await cleanExplorerFile(category, n);
        
        // Remove from processing after completion
        setProcessingFiles(prev => {
          const next = new Set(prev);
          next.delete(n);
          return next;
        });
      }
      
      setShowCleanPanel(false);
      // Reload the file list to show updated files (smooth transition)
      await load(true);
    } catch (e) {
      setError(e?.message || "Clean failed");
      setProcessingFiles(new Set()); // Clear processing on error
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
          <Toolbar
            toolbarDisabled={toolbarDisabled}
            doOpenSelected={doOpenSelected}
            hasSelection={hasSelection}
            onOpenFile={onOpenFile}
            renamingName={renamingName}
            selectedCount={selected.size}
            startRename={startRename}
            openCleanPanel={openCleanPanel}
            requestDelete={requestDelete}
            multiMode={multiMode}
            setMultiMode={setMultiMode}
            busy={busy}
            load={load}
            onClose={onClose}
          />


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
                  <FileTable
                    sorted={sorted}
                    selected={selected}
                    busy={busy}
                    processingFiles={processingFiles}
                    progressMode={progressMode}
                    progressValue={progressValue}
                    onRowMouseDown={onRowMouseDown}
                    onRowMouseUp={onRowMouseUp}
                    onRowMouseLeave={onRowMouseLeave}
                    longPressFired={longPressFired}
                    onRowClick={onRowClick}
                    onRowDoubleClick={onRowDoubleClick}
                    renamingName={renamingName}
                    renameInputRef={renameInputRef}
                    renameDraft={renameDraft}
                    setRenameDraft={setRenameDraft}
                    commitRename={commitRename}
                    cancelRename={cancelRename}
                    formatBytes={formatBytes}
                    formatDateTime={formatDateTime}
                    isNew={isNew}
                  />
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
              <CleanPanel
                show={showCleanPanel}
                onClose={() => setShowCleanPanel(false)}
                busy={busy}
                removeDuplicates={removeDuplicates}
                setRemoveDuplicates={setRemoveDuplicates}
                removeEmptyRows={removeEmptyRows}
                setRemoveEmptyRows={setRemoveEmptyRows}
                standardizeDates={standardizeDates}
                setStandardizeDates={setStandardizeDates}
                selectedDateFormat={selectedDateFormat}
                setSelectedDateFormat={setSelectedDateFormat}
                dateFormats={dateFormats}
                standardizeNumeric={standardizeNumeric}
                setStandardizeNumeric={setStandardizeNumeric}
                numericMode={numericMode}
                setNumericMode={setNumericMode}
                selectedCount={selected.size}
                applyClean={applyClean}
              />
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
            <DeleteConfirmation
              show={showDeleteConfirm}
              selectedCount={selected.size}
              onCancel={() => setShowDeleteConfirm(false)}
              onConfirm={doDeleteConfirmed}
              busy={busy}
            />
          </CSSTransition>
        </div>
      </div>
    </CSSTransition>
  );
}

export default FileExplorer;
