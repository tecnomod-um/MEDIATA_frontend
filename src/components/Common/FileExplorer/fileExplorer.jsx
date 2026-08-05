import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { CSSTransition } from "react-transition-group";
import FileExplorerStyles from "./fileExplorer.module.css";
import { listExplorerFiles, renameExplorerFile, deleteExplorerFile, startCleanExplorerFile, validateCleanExplorerFile, getCleanExplorerFileStatus, getCleanExplorerFileResult, getNormalizationStats, processSelectedDatasets, getProcessSelectedDatasetsStatus, getProcessSelectedDatasetsResult, cancelProcessSelectedDatasetsJob, extractDatasetElements, fetchElementFile, suggestMappings } from "../../../util/petitionHandler";
import { updateNodeAxiosBaseURL } from "../../../util/nodeAxiosSetup";
import FileToolbar from "./fileToolbar";
import FileTable from "./fileTable";
import RelatedDatasetLegend from "./relatedDatasetLegend";
import { toast } from "react-toastify";
import CleanPanel from "./cleanPanel";
import DeleteConfirmation from "./deleteConfirmation";
import { useNavigate } from "react-router-dom";
import { formatBytes, formatDateTime, isFileNew } from "./fileUtils";
import {
  buildRelatedDatasetAnalysisFromSuggestions,
  buildRelatedDatasetPayload,
  buildRelatedDatasetPayloadFromExtractedElements,
  resolveRelatedElementFileName,
} from "./relatedDatasetGroups";

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
  const [relatedMode, setRelatedMode] = useState(false);
  const [relatedBusy, setRelatedBusy] = useState(false);
  const [relatedGroups, setRelatedGroups] = useState([]);
  const [relatedInfoByKey, setRelatedInfoByKey] = useState(() => new Map());

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

  const heightRAF = useRef(null);
  const autoHeightTimer = useRef(null);
  const filesLoadedTimer = useRef(null);
  const modalContainerRef = useRef(null);
  const toolbarRef = useRef(null);

  const mountedRef = useRef(true);
  const activeJobsRef = useRef(new Map());

  const cleanMeasureRef = useRef(null);
  const [cleanOpenHeight, setCleanOpenHeight] = useState(0);
  const [showCleanPanel, setShowCleanPanel] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const pollCleanJobHere = async (jobId, node, onProgress) => {
    while (mountedRef.current) {
      try {
        if (node?.serviceUrl) updateNodeAxiosBaseURL(node.serviceUrl);
  
        const status = await getCleanExplorerFileStatus(jobId);
  
        if (typeof status?.percent === "number") {
          onProgress(status.percent);
        }
  
        const state = String(status?.state || "").toUpperCase();
  
        if (state === "DONE") {
          const result = await getCleanExplorerFileResult(jobId);
  
          if (result?.status === 200) {
            return result.data;
          }
  
          throw new Error(
            result?.data?.message || "Cleaning finished but result was not available"
          );
        }
  
        if (state === "ERROR") {
          throw new Error(status?.message || "Cleaning failed");
        }
  
        await sleep(500);
      } catch (error) {
        if (!mountedRef.current || error?.response?.status === 404) {
          const err = new Error("Cleaning job aborted");
          err.code = "CLEANING_ABORTED";
          throw err;
        }
        throw error;
      }
    }
  
    const err = new Error("Cleaning job aborted");
    err.code = "CLEANING_ABORTED";
    throw err;
  };

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      const entries = Array.from(activeJobsRef.current.entries());
      Promise.allSettled(
        entries.map(async ([jobId, node]) => {
          try {
            if (node?.serviceUrl) updateNodeAxiosBaseURL(node.serviceUrl);
            await cancelProcessSelectedDatasetsJob(jobId);
          } catch (e) {
            // ignore
          }
        })
      );

      activeJobsRef.current.clear();
    };
  }, []);

  const measureCleanHeight = useCallback(() => {
    const modal = modalContainerRef.current;
    if (!modal) return 0;

    const toolbarH = toolbarRef.current?.getBoundingClientRect().height ?? 0;
    const styles = window.getComputedStyle(modal);
    const configuredMaxHeight = parseFloat(styles.maxHeight);
    const availableHeight = Number.isFinite(configuredMaxHeight) && configuredMaxHeight > 0
      ? configuredMaxHeight
      : modal.getBoundingClientRect().height;
    return Math.max(0, availableHeight - toolbarH);
  }, []);

  const navigate = useNavigate();

  const getMaxListAvail = useCallback(() => {
    const modal = modalContainerRef.current;
    if (!modal) return Infinity;

    const toolbarH = toolbarRef.current?.getBoundingClientRect().height ?? 0;

    const cs = window.getComputedStyle(modal);
    const maxH = parseFloat(cs.maxHeight);
    const modalMaxH = Number.isFinite(maxH) && maxH > 0 ? maxH : modal.getBoundingClientRect().height;

    return Math.max(0, modalMaxH - toolbarH);
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
          const maxAvail2 = getMaxListAvail();
          const content2 = el.scrollHeight;
          if (content2 <= maxAvail2 + 1) setListHeight("auto");
          else setListHeight(maxAvail2);
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

  const canShowRelated = category === "DATASETS" || category === "DATASET_ELEMENTS";

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
    setRelatedMode(false);
    setRelatedGroups([]);
    setRelatedInfoByKey(new Map());

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

  const toggleRelatedDatasets = async () => {
    if (!canShowRelated || loading || busy || relatedBusy) return;

    if (relatedMode) {
      setRelatedMode(false);
      return;
    }

    setRelatedBusy(true);
    try {
      let elementFiles = [];
      let elementCountsByKey = {};

      if (category === "DATASETS") {
        const extractedElementsByKey = {};
        const filesByNodeId = new Map();

        sorted.forEach((file) => {
          const nodeId = String(file?.nodeId || "default");
          const bucket = filesByNodeId.get(nodeId) || [];
          bucket.push(file);
          filesByNodeId.set(nodeId, bucket);
        });

        for (const [nodeId, filesForNode] of filesByNodeId.entries()) {
          const node = nodes && nodes.length > 0
            ? nodes.find((candidate) => String(candidate.nodeId) === nodeId)
            : null;
          if (node?.serviceUrl) updateNodeAxiosBaseURL(node.serviceUrl);

          try {
            // eslint-disable-next-line no-await-in-loop
            const extracted = await extractDatasetElements(filesForNode.map((file) => file.name));
            (Array.isArray(extracted) ? extracted : []).forEach((entry) => {
              const fileName = String(entry?.fileName || "");
              if (!fileName) return;
              extractedElementsByKey[`${nodeId}::${fileName}`] = entry;
            });
          } catch (error) {
            // Fall back to saved element files when lightweight extraction is unavailable.
            const availableElementFiles = [];

            try {
              // eslint-disable-next-line no-await-in-loop
              const listed = await listExplorerFiles("DATASET_ELEMENTS");
              availableElementFiles.push(...(Array.isArray(listed)
                ? listed.map((entry) => String(entry?.name || entry)).filter(Boolean)
                : []));
            } catch (listingError) {
              // ignore listing failures and just skip this node if no extraction path works
            }

            for (const file of filesForNode) {
              const elementFileName = resolveRelatedElementFileName(category, file.name, availableElementFiles);
              if (!elementFileName) continue;
              try {
                // eslint-disable-next-line no-await-in-loop
                const csvText = await fetchElementFile(elementFileName);
                if (!csvText) continue;
                extractedElementsByKey[fileKey(file)] = {
                  fileName: file.name,
                  elements: buildRelatedDatasetPayload([file], { [fileKey(file)]: csvText }).elementFiles
                    .filter((element) => element.fileName === file.name)
                    .map((element) => ({ column: element.column, values: element.values })),
                };
              } catch (fetchError) {
                if (fetchError?.response?.status !== 404) {
                  // ignore per-file fallback failures
                }
              }
            }
          }
        }

        ({ elementFiles, elementCountsByKey } =
          buildRelatedDatasetPayloadFromExtractedElements(sorted, extractedElementsByKey));
      } else {
        const elementCsvByKey = {};
        const elementFileNamesByNodeId = new Map();

        if (nodes && nodes.length > 0) {
          for (const node of nodes) {
            if (!node?.serviceUrl) continue;
            updateNodeAxiosBaseURL(node.serviceUrl);
            try {
              // eslint-disable-next-line no-await-in-loop
              const files = await listExplorerFiles("DATASET_ELEMENTS");
              elementFileNamesByNodeId.set(
                String(node.nodeId),
                Array.isArray(files) ? files.map((entry) => String(entry?.name || entry)).filter(Boolean) : []
              );
            } catch (error) {
              elementFileNamesByNodeId.set(String(node.nodeId), []);
            }
          }
        } else {
          try {
            const files = await listExplorerFiles("DATASET_ELEMENTS");
            elementFileNamesByNodeId.set(
              "default",
              Array.isArray(files) ? files.map((entry) => String(entry?.name || entry)).filter(Boolean) : []
            );
          } catch (error) {
            elementFileNamesByNodeId.set("default", []);
          }
        }

        for (const file of sorted) {
          const nodeId = String(file?.nodeId || "default");
          const availableElementFiles = elementFileNamesByNodeId.get(nodeId) || [];
          const elementFileName = resolveRelatedElementFileName(category, file.name, availableElementFiles);
          if (!elementFileName) continue;

          if (nodes && nodes.length > 0) {
            const node = nodes.find((candidate) => candidate.nodeId === file.nodeId);
            if (node?.serviceUrl) updateNodeAxiosBaseURL(node.serviceUrl);
          }

          try {
            // eslint-disable-next-line no-await-in-loop
            const csvText = await fetchElementFile(elementFileName);
            if (csvText) {
              elementCsvByKey[fileKey(file)] = csvText;
            }
          } catch (error) {
            if (error?.response?.status !== 404) {
              // ignore per-file fetch failures unless all files fail
            }
          }
        }

        ({ elementFiles, elementCountsByKey } = buildRelatedDatasetPayload(sorted, elementCsvByKey));
      }

      if (elementFiles.length < 2) {
        toast.info("Not enough dataset element information was available to compare these files.");
        setRelatedMode(false);
        setRelatedGroups([]);
        setRelatedInfoByKey(new Map());
        return;
      }

      const response = await suggestMappings({ elementFiles });
      const analysis = buildRelatedDatasetAnalysisFromSuggestions(
        sorted,
        response,
        elementCountsByKey,
        elementFiles
      );
      if (!analysis.groups.length) {
        toast.info("No likely related datasets were found in this view.");
        setRelatedMode(false);
        setRelatedGroups([]);
        setRelatedInfoByKey(new Map());
        return;
      }

      setRelatedGroups(analysis.groups);
      setRelatedInfoByKey(analysis.groupInfoByKey);
      setRelatedMode(true);
    } catch (error) {
      notifyError(error, "Failed to analyze related datasets");
    } finally {
      setRelatedBusy(false);
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

  const pollJobHere = async (jobId, node, onProgress) => {
    while (mountedRef.current) {
      try {
        if (node?.serviceUrl) updateNodeAxiosBaseURL(node.serviceUrl);

        const status = await getProcessSelectedDatasetsStatus(jobId);
        if (typeof status?.percent === "number") onProgress(status.percent);

        const state = String(status?.state || "").toUpperCase();

        if (state === "DONE") {
          const results = await getProcessSelectedDatasetsResult(jobId);
          activeJobsRef.current.delete(jobId);
          return results || [];
        }

        if (state === "CANCELED") {
          activeJobsRef.current.delete(jobId);
          const err = new Error(status?.message || "File processing was canceled");
          err.code = "DISCOVERY_CANCELED";
          throw err;
        }

        if (state === "ERROR") {
          activeJobsRef.current.delete(jobId);
          throw new Error(status.message || "File processing failed");
        }

        await sleep(500);
      } catch (error) {
        if (!mountedRef.current || error?.response?.status === 404) {
          activeJobsRef.current.delete(jobId);
          const err = new Error("Processing job canceled");
          err.code = "DISCOVERY_CANCELED";
          throw err;
        }
        throw error;
      }
    }

    const err = new Error("Processing job cancele");
    err.code = "DISCOVERY_CANCELED";
    throw err;
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
            activeJobsRef.current.set(result.jobId, node);
            const arr = await pollJobHere(result.jobId, node, (p) => setBarFor(key, p));
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
      if (e?.code === "DISCOVERY_CANCELED") {
        toast.info("Discovery processing canceled.");
      } else {
        notifyError(e, "Failed to open selected files");
      }
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

  const applyClean = async (cleaningOptions) => {
    if (busy || selected.size === 0) return;
  
    setBusy(true);
    setError(null);
  
    const keys = Array.from(selected);
    setProcessingFiles(new Set(keys));
    setSpinnerFor(keys);
  
    try {
      let effectiveCleaningOptions = { ...cleaningOptions };
      if (cleaningOptions.normalizeData) {
        let columns = cleaningOptions.normalizeColumns || [];
        const useAllNumeric = cleaningOptions.normalizationColumnMode === "all_numeric";
        const selectionScope = cleaningOptions.normalizationScope === "selection";
        const statsByFile = [];

        for (const key of keys) {
          const file = findFileByKey(key);
          if (!file) continue;

          const node = nodes?.find((candidate) => candidate.nodeId === file.nodeId);
          if (node?.serviceUrl) updateNodeAxiosBaseURL(node.serviceUrl);

          const response = await getNormalizationStats(
            category,
            file.name,
            useAllNumeric ? [] : columns,
            cleaningOptions
          );
          statsByFile.push({ file, response });
        }

        if (useAllNumeric && selectionScope) {
          const firstColumns = Object.entries(statsByFile[0]?.response?.columns || {});
          columns = firstColumns
            .filter(([, stats]) => stats?.present && stats.validCount > 0 && !stats.invalidCount)
            .map(([column]) => column)
            .filter((column) => statsByFile.every(({ response }) => {
              const stats = response?.columns?.[column];
              return stats?.present && stats.validCount > 0 && !stats.invalidCount;
            }));
          if (columns.length === 0) {
            throw new Error("No fully numeric columns are shared by every selected file.");
          }
        } else if (useAllNumeric) {
          const fileWithoutNumericColumns = statsByFile.find(({ response }) =>
            !Object.values(response?.columns || {}).some(
              (stats) => stats?.present && stats.validCount > 0 && !stats.invalidCount
            )
          );
          if (fileWithoutNumericColumns) {
            throw new Error(
              `No fully numeric columns were found in ${fileWithoutNumericColumns.file.name}. ` +
              "The entire cleaning run was stopped before any file was changed."
            );
          }
        }

        const columnsToValidate = useAllNumeric && !selectionScope ? [] : columns;
        const aggregate = Object.fromEntries(columnsToValidate.map((column) => [column, {
          min: null,
          max: null,
          validCount: 0,
          invalidCount: 0,
        }]));

        for (const { file, response } of statsByFile) {
          for (const column of columnsToValidate) {
            const stats = response?.columns?.[column];
            if (!stats?.present) {
              throw new Error(`Column '${column}' is missing from ${file.name}.`);
            }
            if (!stats.validCount) {
              throw new Error(`Column '${column}' has no numeric values in ${file.name}.`);
            }

            const target = aggregate[column];
            target.min = target.min == null ? stats.min : Math.min(target.min, stats.min);
            target.max = target.max == null ? stats.max : Math.max(target.max, stats.max);
            target.validCount += stats.validCount;
            target.invalidCount += stats.invalidCount || 0;
          }
        }

        if (cleaningOptions.normalizationInvalidValuePolicy === "fail") {
          const invalid = columnsToValidate.find((column) => aggregate[column].invalidCount > 0);
          if (invalid) {
            throw new Error(
              `Column '${invalid}' contains ${aggregate[invalid].invalidCount} non-numeric value(s) across the selection. ` +
              "The entire cleaning run was stopped before any file was changed."
            );
          }
        }

        if (selectionScope) {
          effectiveCleaningOptions = {
            ...cleaningOptions,
            normalizeColumns: columns,
            normalizationColumnMode: "specified",
            normalizationBounds: Object.fromEntries(columns.map((column) => [column, {
              min: aggregate[column].min,
              max: aggregate[column].max,
            }])),
          };
        } else {
          effectiveCleaningOptions.normalizationBounds = {};
        }
      }

      // Validate the complete pipeline on every file before starting any write job.
      for (const key of keys) {
        const file = findFileByKey(key);
        if (!file) continue;
        const node = nodes?.find((candidate) => candidate.nodeId === file.nodeId);
        if (node?.serviceUrl) updateNodeAxiosBaseURL(node.serviceUrl);
        await validateCleanExplorerFile(category, file.name, effectiveCleaningOptions);
      }

      for (const key of keys) {
        const file = findFileByKey(key);
        if (!file) continue;
  
        let node = null;
        if (nodes?.length) {
          node = nodes.find((n) => n.nodeId === file.nodeId);
          if (node?.serviceUrl) updateNodeAxiosBaseURL(node.serviceUrl);
        }
  
        const start = await startCleanExplorerFile(category, file.name, effectiveCleaningOptions);
  
        if (start?.status !== 202 || !start?.data?.jobId) {
          throw new Error(
            start?.data?.message || `Failed to start cleaning for ${file.name}`
          );
        }
  
        setBarFor(key, 0);
  
        const result = await pollCleanJobHere(start.data.jobId, node, (p) => {
          setBarFor(key, p);
        });
  
        setBarFor(key, 100);
        await new Promise((r) => setTimeout(r, 120));
  
        setProcessingFiles((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
  
        clearProgressFor([key]);
  
        if (result?.message) {
          toast.success(result.message);
        }
      }
  
      setShowCleanPanel(false);
      await load(true);
    } catch (e) {
      if (e?.code === "CLEANING_ABORTED") {
        toast.info("Cleaning was interrupted.");
      } else {
        notifyError(e, "Clean failed");
      }
    } finally {
      setProcessingFiles(new Set());
      clearProgressFor(keys);
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
              onBack={() => navigate("/nodes")}
              category={category}
              canShowRelated={canShowRelated}
              relatedMode={relatedMode}
              relatedBusy={relatedBusy}
              onToggleRelated={toggleRelatedDatasets}
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
                    relatedMode={relatedMode}
                    relatedInfoByKey={relatedInfoByKey}
                  />
                )}
              </div>
            </CSSTransition>
            {relatedMode && relatedGroups.length > 0 ? (
              <RelatedDatasetLegend groups={relatedGroups} />
            ) : null}
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
                    busy={busy}
                    selectedCount={selected.size}
                    onClose={() => setShowCleanPanel(false)}
                    onApply={applyClean}
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
