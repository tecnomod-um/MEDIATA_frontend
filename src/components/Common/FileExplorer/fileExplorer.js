import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { CSSTransition } from "react-transition-group";
import FileExplorerStyles from "./fileExplorer.module.css";
import { listExplorerFiles, renameExplorerFile, deleteExplorerFile, cleanExplorerFile, processSelectedDatasets, getProcessSelectedDatasetsStatus, getProcessSelectedDatasetsResult } from "../../../util/petitionHandler";
import { updateNodeAxiosBaseURL } from "../../../util/nodeAxiosSetup";
import FileToolbar from "./fileToolbar";
import FileTable from "./fileTable";
import { toast } from "react-toastify";
import CleanPanel from "./cleanPanel";
import DeleteConfirmation from "./deleteConfirmation";
import { formatBytes, formatDateTime, isFileNew } from "./fileUtils";

const notifyError = (e, fallback) => {
  const msg = e?.response?.data?.message || e?.message || fallback;
  toast.error(msg);
};

// File explorer component for browsing files across nodes of the chosen category
function FileExplorer({ nodes = [], category, isOpen = true, onClose, onOpenFile, onFilesOpened, onFilesSelected, preSelectedFiles = {}, autoProcess = false }) {

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [processingFiles, setProcessingFiles] = useState(() => new Set());
  const [fileProgress, setFileProgress] = useState(() => new Map());

  const [selected, setSelected] = useState(() => new Set());
  const [lastIndex, setLastIndex] = useState(null);

  const [multiMode, setMultiMode] = useState(false);
  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);
  const LONG_PRESS_MS = 380;

  const [renamingKey, setRenamingKey] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const renameInputRef = useRef(null);

  const [filesLoaded, setFilesLoaded] = useState(false);
  const [listHeight, setListHeight] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const [numericColumnsText, setNumericColumnsText] = useState("");

  const heightRAF = useRef(null);
  const autoHeightTimer = useRef(null);
  const filesLoadedTimer = useRef(null);
  const modalContainerRef = useRef(null);
  const toolbarRef = useRef(null);

  const cleanMeasureRef = useRef(null);
  const [cleanOpenHeight, setCleanOpenHeight] = useState(0);

  const measureCleanHeight = useCallback(() => {
    const el = cleanMeasureRef.current;
    if (!el) return 0;
    return el.scrollHeight;
  }, []);

  const getMaxListAvail = useCallback(() => {
    const modal = modalContainerRef.current;
    if (!modal) return Infinity;

    const cs = window.getComputedStyle(modal);
    const maxH = cs.maxHeight && cs.maxHeight !== "none"
      ? parseFloat(cs.maxHeight)
      : modal.getBoundingClientRect().height;

    const toolbarH = toolbarRef.current?.getBoundingClientRect().height ?? 0;
    return Math.max(0, maxH - toolbarH);
  }, []);

  const animateWrapBy = useCallback((delta) => {
    const el = listWrapRef.current;
    if (!el || !delta) return;

    if (heightRAF.current) cancelAnimationFrame(heightRAF.current);
    if (autoHeightTimer.current) clearTimeout(autoHeightTimer.current);

    heightRAF.current = requestAnimationFrame(() => {
      const current = el.getBoundingClientRect().height;
      const maxAvail = getMaxListAvail();
      const predictedContent = Math.max(0, el.scrollHeight + delta);
      const target = Math.min(predictedContent, maxAvail);

      setIsAnimating(true);
      setListHeight(current);

      requestAnimationFrame(() => {
        setListHeight(target);

        autoHeightTimer.current = window.setTimeout(() => {
          if (predictedContent <= maxAvail + 1) setListHeight("auto");
          else setListHeight(maxAvail);

          setIsAnimating(false);
        }, 260);
      });
    });
  }, [getMaxListAvail]);


  const animateWrapToContent = useCallback(() => {
    const el = listWrapRef.current;
    if (!el) return;

    if (heightRAF.current) cancelAnimationFrame(heightRAF.current);
    if (autoHeightTimer.current) clearTimeout(autoHeightTimer.current);

    heightRAF.current = requestAnimationFrame(() => {
      const current = el.getBoundingClientRect().height;
      setListHeight(current);

      requestAnimationFrame(() => {
        const next = el.scrollHeight;
        setListHeight(next);
        autoHeightTimer.current = window.setTimeout(() => setListHeight("auto"), 260);
      });
    });
  }, []);

  const listWrapRef = useRef(null);
  const modalNodeRef = useRef(null);

  const [showCleanPanel, setShowCleanPanel] = useState(false);
  const [removeDuplicates, setRemoveDuplicates] = useState(false);
  const [removeEmptyRows, setRemoveEmptyRows] = useState(false);
  const [standardizeDates, setStandardizeDates] = useState(false);
  const [selectedDateFormat, setSelectedDateFormat] = useState("YYYY-MM-DD");
  const [standardizeNumeric, setStandardizeNumeric] = useState(false);
  const [numericMode, setNumericMode] = useState("double");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const didApplyPreselectRef = useRef(false);
  const didAutoProcessRef = useRef(false);

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

  useEffect(() => {
    if (!showCleanPanel) setCleanOpenHeight(0);
  }, [showCleanPanel]);
  
  useEffect(() => {
    if (!hasSelection) {
      setShowCleanPanel(false);
      setCleanOpenHeight(0);
    }
  }, [hasSelection]);  

  const fileKey = (f) => `${f?.nodeId || "default"}::${f?.name || ""}`;

  const parseKey = (key) => {
    const [nodeId, name] = String(key).split("::");
    return { nodeId: nodeId ?? "default", name: name ?? "" };
  };

  const setSpinnerFor = (keys) => {
    setFileProgress((prev) => {
      const next = new Map(prev);
      keys.forEach((k) => next.set(k, { mode: "spinner", value: 0 }));
      return next;
    });
  };

  const setBarFor = (k, value) => {
    setFileProgress((prev) => {
      const next = new Map(prev);
      next.set(k, { mode: "bar", value: Math.max(0, Math.min(100, Number(value) || 0)) });
      return next;
    });
  };

  const clearProgressFor = (keys) => {
    setFileProgress((prev) => {
      const next = new Map(prev);
      keys.forEach((k) => next.delete(k));
      return next;
    });
  };


  const findFileByKey = (key) => {
    const { nodeId, name } = parseKey(key);
    return sorted.find(
      (f) =>
        String(f.nodeId || "default") === String(nodeId) &&
        String(f.name) === String(name)
    );
  };

  const buildSelectedMapping = (keysSet) => {
    const mapping = {};
    for (const k of keysSet) {
      const f = findFileByKey(k);
      if (!f) continue;
      const nid = f.nodeId || "default";
      if (!mapping[nid]) mapping[nid] = [];
      mapping[nid].push(f.name);
    }
    return mapping;
  };

  const isNew = (f) => isFileNew(f, NEW_WINDOW_MS);

  const clampSelectionToExisting = (nextFiles) => {
    const keys = new Set(nextFiles.map((f) => fileKey(f)));

    setSelected((prev) => {
      const next = new Set();
      for (const k of prev) if (keys.has(k)) next.add(k);
      return next;
    });

    setProcessingFiles((prev) => {
      const next = new Set();
      for (const k of prev) if (keys.has(k)) next.add(k);
      return next;
    });
  };

  const load = async (isReload = false) => {
    setLoading(true);
    setBusy(false);
    setError(null);

    if (!isReload) setFilesLoaded(false);

    setShowCleanPanel(false);
    setRenamingKey(null);
    setShowDeleteConfirm(false);

    try {
      let allFiles = [];

      if (nodes && nodes.length > 0) {
        for (const node of nodes) {
          if (!node?.serviceUrl) continue;

          updateNodeAxiosBaseURL(node.serviceUrl);
          const data = await listExplorerFiles(category);
          const list = Array.isArray(data) ? data : [];
          list.forEach((f) => {
            f.nodeId = node.nodeId;
            f.nodeName = node.nodeName || node.name || "Unknown Node";
          });

          allFiles.push(...list);
        }
      } else {
        const data = await listExplorerFiles(category);
        allFiles = Array.isArray(data) ? data : [];
        allFiles.forEach((f) => {
          if (!("nodeId" in f)) f.nodeId = "default";
          if (!("nodeName" in f)) f.nodeName = "Node";
        });
      }

      setFiles(allFiles);
      clampSelectionToExisting(allFiles);

      filesLoadedTimer.current = window.setTimeout(() => {
        setFilesLoaded(true);
        requestAnimationFrame(() => animateWrapToContent());
      }, 0);
    } catch (e) {
      notifyError(e, "Failed to load files");
      setFiles([]);
      setSelected(new Set());
      setFilesLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const nodeIds = useMemo(() => {
    if (!nodes || nodes.length === 0) return "";
    return nodes.map((n) => n.nodeId).sort().join(",");
  }, [nodes]);

  useEffect(() => {
    if (isOpen) load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, category, nodeIds]);

  useEffect(() => {
    if (renamingKey && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingKey]);

  useEffect(() => {
    if (!filesLoaded || !listWrapRef.current) return;
    const el = listWrapRef.current;
    requestAnimationFrame(() => {
      const h = el.scrollHeight;
      setListHeight(h);
      setTimeout(() => setListHeight("auto"), 260);
    });
  }, [filesLoaded, sorted.length]);

  useEffect(() => {
    if (!isOpen) return;
    if (!filesLoaded) return;
    animateWrapToContent();
  }, [isOpen, filesLoaded, sorted.length, loading, showCleanPanel, showDeleteConfirm, animateWrapToContent]);

  useEffect(() => {
    return () => {
      if (heightRAF.current) cancelAnimationFrame(heightRAF.current);
      if (autoHeightTimer.current) clearTimeout(autoHeightTimer.current);
      if (filesLoadedTimer.current) clearTimeout(filesLoadedTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (!filesLoaded) return;
    if (didApplyPreselectRef.current) return;
    const next = new Set();
    const existing = new Set(files.map((f) => fileKey(f)));

    for (const [nodeId, names] of Object.entries(preSelectedFiles || {})) {
      (names || []).forEach((name) => {
        const k = `${nodeId}::${name}`;
        if (existing.has(k)) next.add(k);
      });
    }

    if (next.size > 0) {
      setSelected(next);
      const firstKey = Array.from(next)[0];
      const idx = sorted.findIndex((f) => fileKey(f) === firstKey);
      if (idx >= 0) setLastIndex(idx);
    }

    didApplyPreselectRef.current = true;
  }, [isOpen, filesLoaded, files, sorted, preSelectedFiles]);

  useEffect(() => {
    if (!isOpen) {
      didApplyPreselectRef.current = false;
      didAutoProcessRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    didApplyPreselectRef.current = false;
    didAutoProcessRef.current = false;
  }, [nodeIds, category]);

  useEffect(() => {
    if (!autoProcess) return;
    if (!isOpen) return;
    if (!filesLoaded) return;
    if (didAutoProcessRef.current) return;
    if (selected.size === 0) return;

    didAutoProcessRef.current = true;

    const t = setTimeout(() => {
      if (onFilesSelected) {
        const mapping = buildSelectedMapping(selected);
        onFilesSelected(mapping);
      } else if (onFilesOpened) {
        doOpenMany(Array.from(selected));
      }
    }, 400);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoProcess, isOpen, filesLoaded, selected, onFilesSelected, onFilesOpened]);

  const cancelRename = () => {
    setRenamingKey(null);
    setRenameDraft("");
  };

  const startRename = () => {
    if (busy) return;
    if (selected.size !== 1) return;

    const onlyKey = Array.from(selected)[0];
    const file = findFileByKey(onlyKey);
    if (!file) return;

    setRenamingKey(onlyKey);
    setRenameDraft(file.name);
    setError(null);
  };

  const commitRename = async () => {
    if (busy) return;
    if (!renamingKey) return;

    const file = findFileByKey(renamingKey);
    if (!file) {
      cancelRename();
      return;
    }

    const from = file.name;
    const to = String(renameDraft || "").trim();

    if (!to || to === from) {
      cancelRename();
      return;
    }

    if (nodes && nodes.length > 0) {
      const node = nodes.find((n) => n.nodeId === file.nodeId);
      if (node?.serviceUrl) updateNodeAxiosBaseURL(node.serviceUrl);
    }

    setBusy(true);
    setError(null);
    try {
      await renameExplorerFile(category, from, to);

      const newKey = `${file.nodeId || "default"}::${to}`;
      setSelected(new Set([newKey]));

      setRenamingKey(null);
      setRenameDraft("");
      await load(true);
    } catch (e) {
      notifyError(e, "Rename failed");
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
      const keys = Array.from(selected);
      for (const key of keys) {
        const file = findFileByKey(key);
        if (!file) continue;

        if (nodes && nodes.length > 0) {
          const node = nodes.find((nd) => nd.nodeId === file.nodeId);
          if (node?.serviceUrl) updateNodeAxiosBaseURL(node.serviceUrl);
        }

        // eslint-disable-next-line no-await-in-loop
        await deleteExplorerFile(category, file.name);
      }

      setSelected(new Set());
      setShowDeleteConfirm(false);
      await load(true);
    } catch (e) {
      notifyError(e, "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const groupSelectedByNode = (keys) => {
    const byNode = {};
    for (const key of keys) {
      const file = findFileByKey(key);
      if (!file) continue;
      const nid = file.nodeId || "default";
      if (!byNode[nid]) byNode[nid] = { nodeId: nid, nodeName: file.nodeName || "Node", keys: [], names: [] };
      byNode[nid].keys.push(key);
      byNode[nid].names.push(file.name);
    }
    return Object.values(byNode);
  };

  const pollJobHere = async (jobId, onProgress) => {
    while (true) {
      const status = await getProcessSelectedDatasetsStatus(jobId);
      if (typeof status?.percent === "number") onProgress(status.percent);

      const state = String(status?.state || "").toUpperCase();
      if (state === "DONE") {
        const results = await getProcessSelectedDatasetsResult(jobId);
        return results || [];
      }
      if (state === "ERROR") throw new Error(status.message || "File processing failed");

      // eslint-disable-next-line no-await-in-loop
      await sleep(500);
    }
  };

  const doOpenMany = async (keys) => {
    if (busy) return;
    if (!keys?.length) return;

    if (!onFilesOpened) {
      toast.error("Multi-file open requires onFilesOpened.");
      return;
    }

    const groups = groupSelectedByNode(keys);
    if (!groups.length) return;
    const keysByNode = {};
    for (const k of keys) {
      const f = findFileByKey(k);
      if (!f) continue;
      const nid = f.nodeId || "default";
      if (!keysByNode[nid]) keysByNode[nid] = [];
      keysByNode[nid].push(k);
    }

    setBusy(true);
    setError(null);
    setProcessingFiles(new Set(keys));
    setSpinnerFor(keys);

    try {
      let allResults = [];
      for (const g of groups) {
        const node = nodes?.find((n) => String(n.nodeId) === String(g.nodeId));
        if (node?.serviceUrl) updateNodeAxiosBaseURL(node.serviceUrl);
        for (const key of (keysByNode[g.nodeId] || [])) {
          const file = findFileByKey(key);
          if (!file) continue;
          const result = await processSelectedDatasets([file.name]);

          if (result?.mode === "sync") {
            const arr = result.results || [];
            allResults = allResults.concat(
              arr.map((r) => ({
                ...r,
                fileName: r.fileName || file.name,
                nodeId: file.nodeId,
                nodeName: file.nodeName,
              }))
            );

            setProcessingFiles((prev) => {
              const next = new Set(prev);
              next.delete(key);
              return next;
            });
            clearProgressFor([key]);
            continue;
          }

          if (result?.mode === "async") {
            setBarFor(key, 0);
            const arr = await pollJobHere(result.jobId, (p) => setBarFor(key, p));
            allResults = allResults.concat(
              (arr || []).map((r) => ({
                ...r,
                fileName: r.fileName || file.name,
                nodeId: file.nodeId,
                nodeName: file.nodeName,
              }))
            );

            setBarFor(key, 100);
            await new Promise((r) => setTimeout(r, 120));

            setProcessingFiles((prev) => {
              const next = new Set(prev);
              next.delete(key);
              return next;
            });
            clearProgressFor([key]);
            continue;
          }

          throw new Error("Unexpected response from processList");
        }
      }

      onFilesOpened(allResults);
    } catch (e) {
      notifyError(e, "Failed to open selected files");
    } finally {
      setProcessingFiles(new Set());
      clearProgressFor(keys);
      setBusy(false);
    }
  };

  const doProcessSelected = async () => {
    if (busy) return;
    if (selected.size === 0) return;

    if (onFilesSelected) {
      const keys = Array.from(selected);
      const mapping = buildSelectedMapping(selected);

      setError(null);
      setBusy(true);
      setProcessingFiles(new Set(keys));
      setSpinnerFor(keys);

      try {
        await onFilesSelected(mapping);
      } catch (e) {
        setError(e?.message || "Failed to process selected files");
      } finally {
        setProcessingFiles(new Set());
        clearProgressFor(keys);
        setBusy(false);
      }
      return;
    }

    if (onFilesOpened) {
      await doOpenMany(Array.from(selected));
      return;
    }
    toast.error("No handler: pass onFilesSelected or onFilesOpened.");
  };

  const toggleCleanPanel = () => {
    if (busy) return;
    if (!hasSelection) return;
    setShowCleanPanel((v) => !v);
  };

  const applyClean = async () => {
    if (busy) return;
    if (selected.size === 0) return;

    setBusy(true);
    setError(null);
    setProcessingFiles(new Set());

    try {
      const keys = Array.from(selected);
      for (const key of keys) {
        const file = findFileByKey(key);
        if (!file) continue;

        if (nodes && nodes.length > 0) {
          const node = nodes.find((nd) => nd.nodeId === file.nodeId);
          if (node?.serviceUrl) updateNodeAxiosBaseURL(node.serviceUrl);
        }

        setProcessingFiles((prev) => new Set([...prev, key]));
        const numericColumns = String(numericColumnsText || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (standardizeNumeric && numericColumns.length === 0) {
          toast.error("Please specify numeric columns (comma-separated).");
          setBusy(false);
          return;
        }
        const cleaningOptions = {
          removeDuplicates,
          removeEmptyRows,
          standardizeDates,
          dateOutputFormat: selectedDateFormat,
          standardizeNumeric,
          numericColumns,
          numericMode,
        };

        await cleanExplorerFile(category, file.name, cleaningOptions);

        setProcessingFiles((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }

      setShowCleanPanel(false);
      await load(true);
    } catch (e) {
      notifyError(e, "Clean failed");
      setProcessingFiles(new Set());
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!hasSelection) setShowCleanPanel(false);
  }, [hasSelection]);

  const setSingle = (key, idx) => {
    setSelected(new Set([key]));
    setLastIndex(idx);
  };

  const toggle = (key, idx) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setLastIndex(idx);
  };

  const addRange = (idx) => {
    if (lastIndex == null) {
      const f = sorted[idx];
      if (f) setSelected(new Set([fileKey(f)]));
      setLastIndex(idx);
      return;
    }

    const start = Math.min(lastIndex, idx);
    const end = Math.max(lastIndex, idx);

    setSelected((prev) => {
      const next = new Set(prev);
      for (let i = start; i <= end; i++) {
        const f = sorted[i];
        if (f) next.add(fileKey(f));
      }
      return next;
    });
  };

  const onRowClick = (e, key, idx) => {
    if (busy) return;
    setError(null);

    if (renamingKey && renamingKey !== key) cancelRename();

    const isShift = e.shiftKey;
    const isCtrl = e.ctrlKey || e.metaKey;

    if (isShift) {
      addRange(idx);
      return;
    }

    if (multiMode || isCtrl) {
      toggle(key, idx);
      return;
    }

    setSingle(key, idx);
  };

  const onRowDoubleClick = (key) => {
    if (busy) return;
    if (renamingKey) return;
    if (!selected.has(key)) {
      setSelected(new Set([key]));
      const idx = sorted.findIndex((f) => fileKey(f) === key);
      if (idx >= 0) setLastIndex(idx);
      setTimeout(() => doProcessSelected(), 0);
      return;
    }
    doProcessSelected();
  };


  const onRowMouseDown = (key, idx) => {
    if (busy) return;

    longPressFired.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);

    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setMultiMode(true);

      setSelected((prev) => {
        const next = new Set(prev);
        if (!next.has(key)) next.add(key);
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

  // keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (busy) return;

      const tag = String(e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") return;

      if (renamingKey) {
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
        doProcessSelected();
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
  }, [isOpen, busy, selected, renamingKey]);

  const toolbarDisabled = busy || loading;

  return (
    <CSSTransition
      in={isOpen}
      timeout={320}
      appear
      nodeRef={modalNodeRef}
      classNames={{
        enter: FileExplorerStyles.fadeModalEnter,
        enterActive: FileExplorerStyles.fadeModalEnterActive,
        exit: FileExplorerStyles.fadeModalExit,
        exitActive: FileExplorerStyles.fadeModalExitActive,
      }}
      unmountOnExit
    >
      <div ref={modalNodeRef} className={FileExplorerStyles.modalBackground}>
        <div ref={modalContainerRef} className={FileExplorerStyles.modalContainer}>
          <div ref={toolbarRef}>
            <FileToolbar
              toolbarDisabled={toolbarDisabled}
              doOpenSelected={doProcessSelected}
              hasSelection={hasSelection}
              onOpenFile={onOpenFile}
              onFilesSelected={onFilesSelected}
              onFilesOpened={onFilesOpened}
              renamingName={renamingKey ? (findFileByKey(renamingKey)?.name || "") : null}
              selectedCount={selected.size}
              startRename={startRename}
              openCleanPanel={toggleCleanPanel}
              requestDelete={requestDelete}
              multiMode={multiMode}
              setMultiMode={setMultiMode}
              busy={busy}
              load={() => load(true)}
              onClose={onClose}
            />
          </div>
          <div className={FileExplorerStyles.contentShell}>
            <div
              className={FileExplorerStyles.cleanSpace}
              style={{
                height: cleanOpenHeight,
                transition: "height 260ms ease",
                overflow: "hidden",
                flex: "0 0 auto",
              }}
              aria-hidden="true"
            />
            <CSSTransition in={filesLoaded} timeout={260} unmountOnExit classNames="">
              <div
                ref={listWrapRef}
                className={FileExplorerStyles.tableWrap}
                style={{
                  height: listHeight,
                  overflowY: isAnimating ? "hidden" : "auto",
                  overflowX: "hidden",
                  transition: "height 260ms ease",
                }}
              >
                {loading ? (
                  <div className={FileExplorerStyles.emptyState}>Loading…</div>
                ) : sorted.length === 0 ? (
                  <div className={FileExplorerStyles.emptyState}>No files available</div>
                ) : (
                  <FileTable
                    sorted={sorted}
                    selected={selected}
                    busy={busy}
                    processingFiles={processingFiles}
                    fileProgress={fileProgress}
                    onLayoutChange={animateWrapBy}
                    nodes={nodes}
                    onRowMouseDown={onRowMouseDown}
                    onRowMouseUp={onRowMouseUp}
                    onRowMouseLeave={onRowMouseLeave}
                    longPressFired={longPressFired}
                    onRowClick={onRowClick}
                    onRowDoubleClick={onRowDoubleClick}
                    renamingKey={renamingKey}
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
                enter: FileExplorerStyles.cleanEnter,
                enterActive: FileExplorerStyles.cleanEnterActive,
                exit: FileExplorerStyles.cleanExit,
                exitActive: FileExplorerStyles.cleanExitActive,
              }}
              unmountOnExit
              onEnter={() => {
                requestAnimationFrame(() => {
                  const h = measureCleanHeight();
                  setCleanOpenHeight(h);
                  animateWrapBy(h);
                });
              }}
              onExit={() => {
                const h = cleanOpenHeight;
                setCleanOpenHeight(0);
                animateWrapBy(-h);
              }}
            >
              <div className={FileExplorerStyles.cleanOverlayAbs}>
                <div ref={cleanMeasureRef} className={FileExplorerStyles.cleanMeasure}>
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
                    numericColumnsText={numericColumnsText}
                    setNumericColumnsText={setNumericColumnsText}
                    selectedCount={selected.size}
                    applyClean={applyClean}
                  />
                </div>
              </div>
            </CSSTransition>
          </div>
          <CSSTransition
            in={showDeleteConfirm}
            timeout={180}
            unmountOnExit
            classNames={{
              enter: FileExplorerStyles.confirmEnter,
              enterActive: FileExplorerStyles.confirmEnterActive,
              exit: FileExplorerStyles.confirmExit,
              exitActive: FileExplorerStyles.confirmExitActive,
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