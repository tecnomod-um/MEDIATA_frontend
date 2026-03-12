import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { CSSTransition } from "react-transition-group";
import { ToastContainer, toast } from "react-toastify";
import { getNodeElements, fetchElementFile, setParseConfigs, fetchSchemaFromBackend, suggestMappings, enrichMappingsStart, getEnrichMappingsStatus, getEnrichMappingsResult } from "../../util/petitionHandler";
import { updateNodeAxiosBaseURL } from "../../util/nodeAxiosSetup";
import { useNode } from "../../context/nodeContext";
import IntegrationStyles from "./integration.module.css";
import ColumnMapping from "../../components/Integration/ColumnMapping/columnMapping";
import ColumnSearchList from "../../components/Integration/ColumnSearchList/columnSearchList";
import FileMapperModal from "../../components/Integration/FileMapperModal/fileMapperModal";
import FileExplorer from "../../components/Common/FileExplorer/fileExplorer";
import SchemaTray from "../../components/Common/SchemaTray/schemaTray";
import MappingsResult from "../../components/Integration/MappingsResult/mappingsResult";
import { generateDistinctColors } from "../../util/colors";

function Integration() {
  const location = useLocation();
  const { selectedNodes } = useNode();

  const [elementFileList, setElementFileList] = useState([]);
  const [columnsData, setColumnsData] = useState([]);
  const [processingStatus, setProcessingStatus] = useState("idle");
  const [mappings, setMappings] = useState([]);
  const [temporaryGroups, setTemporaryGroups] = useState([]);
  const [deletedItems, setDeletedItems] = useState([]);
  const [isFileMapperOpen, setIsFileMapperOpen] = useState(false);
  const [schema, setSchema] = useState(null);
  const [schemaError, setSchemaError] = useState("");
  const [hasProcessedElementFiles, setHasProcessedElementFiles] = useState(false);
  const [loadedDraft, setLoadedDraft] = useState(null);
  const [selectedMappingId, setSelectedMappingId] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [activeMobilePanel, setActiveMobilePanel] = useState("mapping");
  const [isMobile, setIsMobile] = useState(false);
  const [isGenerateMetadataLoading, setIsGenerateMetadataLoading] = useState(false);
  const [generateMetadataProgress, setGenerateMetadataProgress] = useState(0);
  const enrichPollRef = useRef(null);
  const lastEnrichMsgRef = useRef("");
  const lastEnrichStepRef = useRef("");
  const enrichToastIdRef = useRef(null);

  useEffect(() => {
    return () => {
      if (enrichPollRef.current) {
        clearInterval(enrichPollRef.current);
        enrichPollRef.current = null;
      }
      closeEnrichToast();
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    // If mobile and no columns loaded yet, default to columns (FileExplorer flow)
    if (isMobile && !columnsData.length) setActiveMobilePanel("columns");
  }, [isMobile, columnsData.length]);



  //
  useEffect(() => {
    if (!selectedNodes || selectedNodes.length === 0) return;

    (async () => {
      try {
        const nodeFilesArray = await Promise.all(
          selectedNodes.map(async (node) => {
            updateNodeAxiosBaseURL(node.serviceUrl);
            const files = await getNodeElements();
            return {
              nodeId: node.nodeId,
              nodeName: node.name,
              files: files || [],
            };
          })
        );
        setElementFileList(nodeFilesArray);
      } catch (err) {
        console.error("Error fetching element files from multiple nodes:", err);
      }
    })();
  }, [selectedNodes]);

  useEffect(() => {
    if (processingStatus === "success") toast.success("Files processed successfully.");
    else if (processingStatus === "error") toast.error("An error occurred during processing.");
  }, [processingStatus]);

  const parseCSV = (text) => {
    const lines = text.trim().split("\n");
    return lines.map((line) => {
      const [column, ...values] = line.split(",");
      return { column, values };
    });
  };

  const extractHierarchy = (res) => {
    const r = res && typeof res === "object" ? res : null;
    const hierarchy = r?.hierarchy;

    return Array.isArray(hierarchy) ? hierarchy : [];
  };

  const handleSuggestMappings = async (mode = "append") => {
    try {
      const payload = { elementFiles: columnsData, ...(schema ? { schema } : {}) };
      const res = await suggestMappings(payload);

      if (res?.success === false) {
        toast.error(res?.message || "Failed to generate suggestions.");
        return;
      }

      const nextHierarchy = extractHierarchy(res);

      if (!nextHierarchy.length) {
        toast.info(res?.message || "No suggestions produced.");
        return;
      }

      if (mode === "replace") {
        setMappings(nextHierarchy);
        setDeletedItems([]);
        setLoadedDraft(null);
        setTemporaryGroups([]);
        toast.success("Suggestions applied (replaced).");
      } else {
        setMappings((prev) => [...prev, ...nextHierarchy]);
        toast.success("Suggestions applied (appended).");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate suggestions.");
    }
  };

  const handleClearMappingEditor = useCallback(() => {
    setTemporaryGroups([]);
    setLoadedDraft(null);
    setEditTarget(null);
    setSelectedMappingId(null);
  }, []);

  const normalizeEnrichStep = (msg) => {
    const m = String(msg || "").trim();
    if (!m) return "";
    return m.replace(/\(batch\s+\d+\s*\/\s*\d+\)/i, "").trim();
  };

  const showOrUpdateEnrichToast = (msg, pct) => {
    const text = msg?.trim() ? `${msg} (${pct}%)` : `Working… (${pct}%)`;
  
    const id = enrichToastIdRef.current;
  
    if (!id || !toast.isActive(id)) {
      enrichToastIdRef.current = toast.info(text, {
        autoClose: false,
        closeButton: false,
        draggable: false,
        toastId: "enrich-progress",
      });
      return;
    }
  
    toast.update(id, {
      render: text,
      type: "info",
      autoClose: false,
      closeButton: false,
      draggable: false,
    });
  };

  const closeEnrichToast = () => {
    if (enrichToastIdRef.current != null) {
      toast.dismiss(enrichToastIdRef.current);
      enrichToastIdRef.current = null;
    }
  };

  const handleGenerateMetadata = useCallback(async () => {
    if (isGenerateMetadataLoading) return;

    // stop any previous poller
    if (enrichPollRef.current) {
      clearInterval(enrichPollRef.current);
      enrichPollRef.current = null;
    }

    if (!mappings?.length) {
      toast.info("No mappings to enrich yet.");
      return;
    }

    setIsGenerateMetadataLoading(true);
    setGenerateMetadataProgress(0);

    try {
      const start = await enrichMappingsStart({ hierarchy: mappings, schema });

      if (start?.status === 200) {
        const nextHierarchy = extractHierarchy(start?.data);
        if (nextHierarchy.length) setMappings(nextHierarchy);
        setGenerateMetadataProgress(100);
        toast.success(start?.data?.message || "Metadata generated.");
        return;
      }

      if (start?.status !== 202) {
        toast.error(start?.data?.message || "Failed to start metadata generation.");
        return;
      }

      const jobId = start?.data?.jobId;
      if (!jobId) {
        toast.error("Metadata generation did not return a jobId.");
        return;
      }

      await new Promise((resolve, reject) => {
        let inFlight = false;

        enrichPollRef.current = setInterval(async () => {
          if (inFlight) return;
          inFlight = true;

          try {
            const st = await getEnrichMappingsStatus(jobId);
            const pct = Math.max(0, Math.min(100, Number(st?.percent) || 0));
            setGenerateMetadataProgress(pct);
            const msg = String(st?.message || "").trim();
            const step = normalizeEnrichStep(msg);

            if (step && step !== lastEnrichStepRef.current) {
              lastEnrichStepRef.current = step;
              showOrUpdateEnrichToast(msg, pct);
            } else if (enrichToastIdRef.current != null) {
              showOrUpdateEnrichToast(msg || lastEnrichMsgRef.current, pct);
            }

            lastEnrichMsgRef.current = msg;


            if (st?.state === "FAILED") {
              clearInterval(enrichPollRef.current);
              enrichPollRef.current = null;
              closeEnrichToast();
              reject(new Error(st?.message || "Metadata generation failed."));
              return;
            }

            if (st?.state === "DONE") {
              clearInterval(enrichPollRef.current);
              enrichPollRef.current = null;

              const res = await getEnrichMappingsResult(jobId);

              if (res?.status === 200) {
                const nextHierarchy = extractHierarchy(res?.data);
                if (nextHierarchy.length) setMappings(nextHierarchy);
                setGenerateMetadataProgress(100);
                closeEnrichToast();
                toast.success(res?.data?.message || "Metadata generated.");
                resolve();
              } else {
                closeEnrichToast();
                reject(new Error("Metadata result not available."));
              }
            }
          } catch (e) {
            clearInterval(enrichPollRef.current);
            enrichPollRef.current = null;
            closeEnrichToast();
            reject(e);
          } finally {
            inFlight = false;
          }
        }, 400);
      });
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to generate metadata.");
    } finally {
      setIsGenerateMetadataLoading(false);
    }
  }, [isGenerateMetadataLoading, mappings, schema, extractHierarchy]);

  const mergeColumnsData = useCallback((existingData, newData) => {
    const mergedData = [...existingData];
    newData.forEach((row) => {
      const existingColumn = mergedData.find(
        (item) => item.column === row.column && item.fileName === row.fileName
      );
      if (existingColumn) {
        existingColumn.values = Array.from(new Set([...existingColumn.values, ...row.values]));
        existingColumn.nodeId = row.nodeId;
      } else {
        mergedData.push(row);
      }
    });
    return mergedData;
  }, []);

  const initializeMappings = useCallback((data, fileName, nodeId) => {
    const newMapping = data.reduce((acc, column) => {
      const filteredValues = column.values.filter((value) => {
        if (column.values.includes("integer") || column.values.includes("double"))
          return !value.startsWith("min:") && !value.startsWith("max:");
        if (column.values.includes("date"))
          return !value.startsWith("earliest:") && !value.startsWith("latest:");
        return true;
      });

      const groupKey = `${nodeId}::${fileName}::${column.column}`;

      acc[column.column] = {
        fileName,
        nodeId,
        columns: [column.column],
        groups: [
          {
            column: column.column,
            values: filteredValues.map((val) => ({
              name: val,
              mapping: [
                {
                  groupKey,
                  groupColumn: column.column,
                  fileName,
                  nodeId,
                  value: val,
                },
              ],
            })),
          },
        ],
      };

      return acc;
    }, {});

    setMappings((prev) => [...prev, newMapping]);
  }, []);

  const handleProcessSelectedElements = useCallback(
    async (selectedFilenamesMapping) => {
      setProcessingStatus("processing");

      try {
        let mergedCols = [...columnsData];

        const allSelectedFiles = [];
        selectedNodes.forEach((node) => {
          const filesForNode = selectedFilenamesMapping[node.nodeId] || [];
          filesForNode.forEach((f) => allSelectedFiles.push(f));
        });

        const fileColors = generateDistinctColors(allSelectedFiles.length);
        let colorIndex = 0;

        await Promise.all(
          selectedNodes.map(async (node) => {
            const filesForNode = selectedFilenamesMapping[node.nodeId] || [];
            if (filesForNode.length === 0) return;
            updateNodeAxiosBaseURL(node.serviceUrl);

            const fileTexts = await Promise.all(
              filesForNode.map(async (filename) => {
                const text = await fetchElementFile(filename);
                return { filename, text };
              })
            );

            fileTexts.forEach((fileObj) => {
              const { filename, text } = fileObj;
              const parsed = parseCSV(text);
              parsed.forEach((col) => {
                col.color = fileColors[colorIndex];
                col.fileName = filename;
                col.nodeId = node.nodeId;
              });
              colorIndex++;
              mergedCols = mergeColumnsData(mergedCols, parsed);
              initializeMappings(parsed, filename, node.nodeId);
            });
          })
        );

        setColumnsData(mergedCols);
        setProcessingStatus("idle");
      } catch (error) {
        console.error("Error processing element files:", error);
        setProcessingStatus("error");
      }
    },
    [columnsData, selectedNodes, mergeColumnsData, initializeMappings]
  );

  useEffect(() => {
    if (!hasProcessedElementFiles && location.state?.elementFiles?.length) {
      const elementFiles = location.state.elementFiles;
      const nodeMapping = {};
      for (const { nodeId, fileName } of elementFiles) {
        if (!nodeMapping[nodeId]) nodeMapping[nodeId] = [];
        nodeMapping[nodeId].push(fileName);
      }
      handleProcessSelectedElements(nodeMapping);
      setHasProcessedElementFiles(true);
    }
  }, [location.state, hasProcessedElementFiles, handleProcessSelectedElements]);

  const handleProcessMappings = async (selectedDatasets, currentMappings, cleanOpts) => {
    setProcessingStatus("processing");

    try {
      const nodeFileMappings = {};

      for (const fileName of Object.keys(selectedDatasets)) {
        const col = columnsData.find((c) => c.fileName === fileName);
        if (!col) continue;

        const nodeId = col.nodeId;
        if (!nodeFileMappings[nodeId]) nodeFileMappings[nodeId] = {};

        nodeFileMappings[nodeId][fileName] = selectedDatasets[fileName];
      }

      for (const node of selectedNodes) {
        const fileMappingsForNode = nodeFileMappings[node.nodeId];
        if (!fileMappingsForNode) continue;
        updateNodeAxiosBaseURL(node.serviceUrl);

        const payload = {
          fileMappings: JSON.stringify(fileMappingsForNode),
          configs: JSON.stringify(currentMappings),
          cleaningOptions: cleanOpts,
        };

        console.log("[handleProcessMappings] payload for node", node.nodeId, payload);
        await setParseConfigs(payload);
      }

      setProcessingStatus("success");
      return "All parse requests done";
    } catch (error) {
      console.error("Error processing mappings:", error);
      setProcessingStatus("error");
      return "Error occurred";
    }
  };

  const handleMappingChange = (newGroups) => {
    setLoadedDraft(null);
    setTemporaryGroups(newGroups);
  };

  const mappingKeyExists = useCallback(
    (key) => mappings.some((obj) => Object.prototype.hasOwnProperty.call(obj, key)),
    [mappings]
  );

  const oneHotAnyExists = useCallback(
    (unionName, customValues) => customValues.some((cv) => mappingKeyExists(`${unionName}_${cv.name}`)),
    [mappingKeyExists]
  );

  // Integration.jsx (only these functions need to be replaced)
  // 1) handleSaveMappings (whole)
  // 2) the MOBILE ColumnMapping onSave wrapper (whole snippet)

  const handleSaveMappings = (
    groups,
    unionName,
    customValues,
    removeFromHierarchy,
    isOneHotMapping,
    unionMeta
  ) => {
    const norm = (s) => String(s ?? "").trim();
    const normalizedUnion = norm(unionName);
    const normalizedCustomValues = (customValues || []).map((cv) => ({
      ...cv,
      name: norm(cv.name),
    }));

    // Are we editing an existing mapping?
    const isEditing =
      !!editTarget &&
      typeof editTarget.index === "number" &&
      editTarget.key &&
      mappings?.[editTarget.index]?.[editTarget.key];

    // Base key for one-hot (what user types as unionName)
    const oldOneHotBase = isEditing
      ? norm(
        editTarget.base ||
        (editTarget.key.includes("_")
          ? editTarget.key.slice(0, editTarget.key.lastIndexOf("_"))
          : editTarget.key)
      )
      : "";

    // Only do dup checks when creating OR renaming
    const shouldCheckDup = (() => {
      if (!isEditing) return true;
      if (isOneHotMapping) return normalizedUnion !== oldOneHotBase; // renaming base
      return normalizedUnion !== norm(editTarget.key); // renaming standard key
    })();

    const mappingKeyExistsExcept = (key, excludeIndex, excludeKeysSet) => {
      return (mappings || []).some((obj, idx) => {
        return Object.keys(obj || {}).some((k) => {
          if (idx === excludeIndex && excludeKeysSet?.has(k)) return false;
          return k === key;
        });
      });
    };

    const oneHotAnyExistsExcept = (base, cvs, excludeIndex, excludeKeysSet) => {
      return (cvs || []).some((cv) =>
        mappingKeyExistsExcept(`${base}_${cv.name}`, excludeIndex, excludeKeysSet)
      );
    };

    let excludeIndex = null;
    let excludeKeys = null;

    if (isEditing && shouldCheckDup) {
      excludeIndex = editTarget.index;

      if (isOneHotMapping) {
        const base = oldOneHotBase;
        const obj = mappings?.[editTarget.index] || {};
        excludeKeys = new Set(Object.keys(obj).filter((k) => k.startsWith(base + "_")));
        if (!excludeKeys.size) excludeKeys.add(editTarget.key);
      } else {
        excludeKeys = new Set([editTarget.key]);
      }
    }

    if (shouldCheckDup) {
      if (isOneHotMapping) {
        if (
          oneHotAnyExistsExcept(
            normalizedUnion,
            normalizedCustomValues,
            excludeIndex,
            excludeKeys
          )
        ) {
          toast.error("Mapping already exists in the hierarchy.");
          return false;
        }
      } else {
        if (mappingKeyExistsExcept(normalizedUnion, excludeIndex, excludeKeys)) {
          toast.error("Mapping already exists in the hierarchy.");
          return false;
        }
      }
    }

    // ---------------------------
    // NO-OP DETECTION (editing only)
    // ---------------------------
    const stableStringify = (x) => {
      const seen = new WeakSet();
      return JSON.stringify(x, (k, v) => {
        if (v && typeof v === "object") {
          if (seen.has(v)) return;
          seen.add(v);
          if (!Array.isArray(v)) {
            return Object.keys(v)
              .sort()
              .reduce((acc, key) => {
                acc[key] = v[key];
                return acc;
              }, {});
          }
        }
        return v;
      });
    };

    if (isEditing) {
      const idx = editTarget.index;
      const obj = mappings?.[idx] || {};

      if (isOneHotMapping) {
        const base = oldOneHotBase;
        const oldKeys = Object.keys(obj).filter((k) => k.startsWith(base + "_"));

        const oldBySuffix = {};
        oldKeys.forEach((k) => {
          const suffix = k.slice(base.length + 1);
          oldBySuffix[suffix] = obj[k];
        });

        let changed = false;

        // base rename or different count implies change
        if (normalizedUnion !== base) changed = true;
        if (oldKeys.length !== normalizedCustomValues.length) changed = true;

        normalizedCustomValues.forEach((cv) => {
          const suffix = cv.name;
          const oldMapping = oldBySuffix[suffix];

          if (!oldMapping) {
            changed = true;
            return;
          }

          const oldOnes =
            oldMapping?.groups?.[0]?.values?.find((v) => v?.name === "1") || {};

          const nextSnapshot = stableStringify({
            unionMeta: {
              terminology: unionMeta?.terminology || "",
              description: unionMeta?.description || "",
            },
            columns: (groups || []).map((g) => g.column),
            ones: {
              mapping: cv.mapping || [],
              terminology: cv.terminology || "",
              description: cv.description || "",
            },
          });

          const oldSnapshot = stableStringify({
            unionMeta: {
              terminology: oldMapping?.terminology || "",
              description: oldMapping?.description || "",
            },
            columns: oldMapping?.columns || [],
            ones: {
              mapping: oldOnes?.mapping || [],
              terminology: oldOnes?.terminology || "",
              description: oldOnes?.description || "",
            },
          });

          if (nextSnapshot !== oldSnapshot) changed = true;
        });

        // removeFromHierarchy is an action; treat it as a change-intent
        if (removeFromHierarchy) changed = true;

        if (!changed) {
          toast.error("No changes to save.");
          return false;
        }
      } else {
        const oldKey = editTarget.key;
        const oldMapping = obj?.[oldKey];

        const oldValues = oldMapping?.groups?.[0]?.values || [];

        const oldSnapshot = stableStringify({
          key: norm(oldKey),
          unionMeta: {
            terminology: oldMapping?.terminology || "",
            description: oldMapping?.description || "",
          },
          columns: oldMapping?.columns || [],
          values: oldValues.map((v) => ({
            name: norm(v?.name),
            terminology: v?.terminology || "",
            description: v?.description || "",
            mapping: v?.mapping || [],
          })),
        });

        const nextSnapshot = stableStringify({
          key: normalizedUnion,
          unionMeta: {
            terminology: unionMeta?.terminology || "",
            description: unionMeta?.description || "",
          },
          columns: (groups || []).map((g) => g.column),
          values: (normalizedCustomValues || []).map((v) => ({
            name: norm(v?.name),
            terminology: v?.terminology || "",
            description: v?.description || "",
            mapping: v?.mapping || [],
          })),
        });

        const changed = removeFromHierarchy ? true : oldSnapshot !== nextSnapshot;

        if (!changed) {
          toast.error("No changes to save.");
          return false;
        }
      }
    }

    // ---------------------------
    // APPLY SAVE
    // ---------------------------

    // ONE-HOT
    if (isOneHotMapping) {
      // Build family (CREATE defaults to custom_mapping; EDIT will preserve below)
      const newFamily = {};
      normalizedCustomValues.forEach((cv) => {
        const columnName = `${normalizedUnion}_${cv.name}`;
        newFamily[columnName] = {
          mappingType: "one-hot",
          fileName: "custom_mapping", // CREATE default; EDIT will override/preserve per key
          columns: (groups || []).map((g) => g.column),
          terminology: unionMeta?.terminology || "",
          description: unionMeta?.description || "",
          groups: [
            {
              column: columnName,
              values: [
                {
                  name: "1",
                  mapping: cv.mapping,
                  terminology: cv.terminology || "",
                  description: cv.description || "",
                },
                { name: "0", mapping: [] },
              ],
            },
          ],
        };
      });

      // EDIT IN PLACE: preserve original fileName(s)
      if (isEditing) {
        const baseToRemove = oldOneHotBase;

        setMappings((prev) =>
          prev.map((obj, idx) => {
            if (idx !== editTarget.index) return obj;

            const out = { ...(obj || {}) };

            // capture old family fileNames by suffix before deleting
            const oldSuffixToFileName = {};
            Object.entries(out).forEach(([k, v]) => {
              if (k.startsWith(baseToRemove + "_")) {
                const suffix = k.slice(baseToRemove.length + 1);
                oldSuffixToFileName[suffix] = v?.fileName;
              }
            });

            // remove old family
            Object.keys(out).forEach((k) => {
              if (k.startsWith(baseToRemove + "_")) delete out[k];
            });

            // remove source columns if requested
            if (removeFromHierarchy) {
              (groups || []).forEach((g) => delete out[g.column]);
            }

            // write new family, preserving fileName by matching suffix when possible
            Object.entries(newFamily).forEach(([k, v]) => {
              const suffix = k.slice(normalizedUnion.length + 1);
              const preserved = oldSuffixToFileName[suffix];
              out[k] = preserved ? { ...v, fileName: preserved } : v;
            });

            return out;
          })
        );

        setTemporaryGroups([]);
        setLoadedDraft(null);

        setEditTarget((prev) =>
          prev
            ? {
              ...prev,
              key: `${normalizedUnion}_${normalizedCustomValues?.[0]?.name || ""}`,
              base: normalizedUnion,
              type: "one-hot",
            }
            : prev
        );

        return true;
      }

      // CREATE
      if (removeFromHierarchy) {
        const updated = (mappings || []).map((m) => {
          const newMap = { ...m };
          (groups || []).forEach((group) => delete newMap[group.column]);
          return newMap;
        });
        setMappings([...updated, newFamily]);
      } else {
        setMappings((prev) => [...prev, newFamily]);
      }

      setTemporaryGroups([]);
      setLoadedDraft(null);
      return true;
    }

    // STANDARD
    const nextStandardCreate = {
      mappingType: "standard",
      fileName: "custom_mapping", // CREATE default; EDIT will preserve below
      columns: (groups || []).map((g) => g.column),
      terminology: unionMeta?.terminology || "",
      description: unionMeta?.description || "",
      groups: [
        {
          column: normalizedUnion,
          values: (normalizedCustomValues || []).map((v) => ({
            ...v,
            terminology: v.terminology || "",
            description: v.description || "",
          })),
        },
      ],
    };

    // EDIT IN PLACE: preserve existing fileName
    if (isEditing) {
      const oldKey = editTarget.key;

      setMappings((prev) =>
        prev.map((obj, idx) => {
          if (idx !== editTarget.index) return obj;

          const out = { ...(obj || {}) };
          const existing = out[oldKey];
          const preservedFileName = existing?.fileName || "custom_mapping";

          if (removeFromHierarchy) {
            (groups || []).forEach((g) => delete out[g.column]);
          }

          if (oldKey !== normalizedUnion) delete out[oldKey];

          out[normalizedUnion] = { ...nextStandardCreate, fileName: preservedFileName };
          return out;
        })
      );

      setTemporaryGroups([]);
      setLoadedDraft(null);

      setSelectedMappingId(`${editTarget.index}::${normalizedUnion}`);
      setEditTarget({ index: editTarget.index, key: normalizedUnion, type: "standard" });

      return true;
    }

    // CREATE
    const newMapping = { [normalizedUnion]: nextStandardCreate };

    if (removeFromHierarchy) {
      const updated = (mappings || []).map((m) => {
        const newMap = { ...m };
        (groups || []).forEach((group) => delete newMap[group.column]);
        return newMap;
      });
      setMappings([...updated, newMapping]);
    } else {
      setMappings((prev) => [...prev, newMapping]);
    }

    setTemporaryGroups([]);
    setLoadedDraft(null);
    return true;
  };


  const handleDeleteMapping = (mappingIndex, mappingKey) => {
    const mappingToDelete = {
      index: mappingIndex,
      key: mappingKey,
      mapping: mappings[mappingIndex][mappingKey],
    };
    setDeletedItems((prev) => [...prev, mappingToDelete]);

    const updatedMappings = mappings.map((mapping, idx) => {
      if (idx === mappingIndex) {
        const newMapping = { ...mapping };
        delete newMapping[mappingKey];
        return newMapping;
      }
      return mapping;
    });

    setMappings(updatedMappings);
  };

  const handleUndoDelete = () => {
    if (deletedItems.length > 0) {
      const lastDeletedItem = deletedItems[deletedItems.length - 1];
      const { index, key, mapping } = lastDeletedItem;

      const updatedMappings = mappings.map((mappingObj, idx) => {
        if (idx === index) return { ...mappingObj, [key]: mapping };
        return mappingObj;
      });

      setMappings(updatedMappings);
      setDeletedItems(deletedItems.slice(0, -1));
    }
  };

  const formatValue = (value, type) => {
    if (type === "date") {
      const date = new Date(value);
      return date instanceof Date && !isNaN(date) ? date.toISOString().split("T")[0] : "";
    }
    return value !== undefined && value !== null ? value.toString() : "";
  };

  useEffect(() => {
    (async function loadSchema() {
      try {
        const result = await fetchSchemaFromBackend();
        if (result && result.schema) setSchema(result.schema);
      } catch (err) {
        console.error("Failed to fetch schema from backend in Mappings:", err);
      }
    })();
  }, []);

  const handleRemoveExternalSchema = () => {
    setSchema(null);
  };

  let preSelected = {};
  if (location.state?.elementFiles?.length) {
    location.state.elementFiles.forEach(({ nodeId, fileName }) => {
      if (!preSelected[nodeId]) preSelected[nodeId] = [];
      preSelected[nodeId].push(fileName);
    });
  }

  const handleFilesOpened = useCallback(
    (payload) => {
      let nodeMapping = {};

      if (Array.isArray(payload)) {
        payload.forEach(({ nodeId, fileName }) => {
          if (!nodeMapping[nodeId]) nodeMapping[nodeId] = [];
          nodeMapping[nodeId].push(fileName);
        });
      } else if (payload && typeof payload === "object") {
        nodeMapping = payload;
      }

      handleProcessSelectedElements(nodeMapping);
    },
    [handleProcessSelectedElements]
  );

  const buildGroupsFromMapping = useCallback((mapping, columnsData) => {
    const refs = new Map();

    (mapping?.groups || []).forEach((g) => {
      (g?.values || []).forEach((v) => {
        (v?.mapping || []).forEach((m) => {
          const key = `${m.nodeId}::${m.fileName}::${m.groupColumn}`;
          refs.set(key, { nodeId: m.nodeId, fileName: m.fileName, column: m.groupColumn });
        });
      });
    });

    const groups = [];
    for (const ref of refs.values()) {
      const col = columnsData.find(
        (c) => c.nodeId === ref.nodeId && c.fileName === ref.fileName && c.column === ref.column
      );
      if (col) groups.push(col);
    }
    return groups;
  }, []);

  const makeId = () => crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`;

  const buildStandardDraft = useCallback(
    (mappingKey, mapping, columnsData) => {
      const values = mapping?.groups?.[0]?.values || [];

      const customValues = values.map((v) => ({
        id: makeId(),
        name: v?.name || "",
        snomedTerm: v?.terminology || "",
        mapping: v?.mapping || [],
      }));

      const valueDescriptions = {};
      customValues.forEach((cv, i) => {
        valueDescriptions[cv.id] = values[i]?.description || "";
      });

      return {
        groups: buildGroupsFromMapping(mapping, columnsData),
        unionName: mappingKey,
        unionTerminology: mapping?.terminology || "",
        unionDescription: mapping?.description || "",
        useHotOneMapping: false,
        removeFromHierarchy: false,
        customValues,
        valueDescriptions,
      };
    },
    [buildGroupsFromMapping]
  );

  const collectOneHotFamily = useCallback((mappings, base) => {
    const found = [];
    mappings.forEach((obj) => {
      Object.entries(obj).forEach(([k, m]) => {
        if (m?.mappingType === "one-hot" && k.startsWith(base + "_")) {
          found.push({ key: k, mapping: m });
        }
      });
    });
    found.sort((a, b) => a.key.localeCompare(b.key));
    return found;
  }, []);

  const buildOneHotDraft = useCallback(
    (selectedKey, mappings, columnsData) => {
      const base = selectedKey.slice(0, selectedKey.lastIndexOf("_"));
      if (!base) return null;

      const family = collectOneHotFamily(mappings, base);
      if (!family.length) return null;

      const first = family[0].mapping;

      const customValues = [];
      const valueDescriptions = {};

      family.forEach(({ key, mapping }) => {
        const suffix = key.slice(base.length + 1);
        const ones = mapping?.groups?.[0]?.values?.find((v) => v.name === "1");
        const id = makeId();

        customValues.push({
          id,
          name: suffix,
          snomedTerm: ones?.terminology || "",
          mapping: ones?.mapping || [],
        });

        valueDescriptions[id] = ones?.description || "";
      });

      return {
        groups: buildGroupsFromMapping(first, columnsData),
        unionName: base,
        unionTerminology: first?.terminology || "",
        unionDescription: first?.description || "",
        useHotOneMapping: true,
        removeFromHierarchy: false,
        customValues,
        valueDescriptions,
      };
    },
    [buildGroupsFromMapping, collectOneHotFamily]
  );

  return (
    <div className={IntegrationStyles.pageContainer}>
      <FileMapperModal
        isOpen={isFileMapperOpen}
        closeModal={() => setIsFileMapperOpen(false)}
        mappings={mappings}
        columnsData={columnsData}
        nodes={selectedNodes}
        onSend={handleProcessMappings}
      />

      {!columnsData.length && (
        <FileExplorer
          nodes={selectedNodes}
          category="DATASET_ELEMENTS"
          isOpen={true}
          preSelectedFiles={preSelected}
          autoProcess={!!location.state?.elementFiles?.length}
          onFilesOpened={handleFilesOpened}
        />
      )}

      <div className={IntegrationStyles.mappingContainer}>
        {/* MOBILE */}
        {isMobile ? (
          <>
            {columnsData.length > 0 && (
              <div className={IntegrationStyles.mobileNav} role="tablist" aria-label="Integration panels">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMobilePanel === "columns"}
                  className={`${IntegrationStyles.mobileNavBtn} ${activeMobilePanel === "columns" ? IntegrationStyles.mobileNavBtnActive : ""
                    }`}
                  onClick={() => setActiveMobilePanel("columns")}
                >
                  Columns
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMobilePanel === "mapping"}
                  className={`${IntegrationStyles.mobileNavBtn} ${activeMobilePanel === "mapping" ? IntegrationStyles.mobileNavBtnActive : ""
                    }`}
                  onClick={() => setActiveMobilePanel("mapping")}
                >
                  Mapping
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMobilePanel === "hierarchy"}
                  className={`${IntegrationStyles.mobileNavBtn} ${activeMobilePanel === "hierarchy" ? IntegrationStyles.mobileNavBtnActive : ""
                    }`}
                  onClick={() => setActiveMobilePanel("hierarchy")}
                >
                  Hierarchy
                </button>
              </div>
            )}

            <CSSTransition
              in={!!columnsData.length}
              classNames={{
                enter: IntegrationStyles.columnsSectionEnter,
                enterActive: IntegrationStyles.columnsSectionEnterActive,
                exit: IntegrationStyles.columnsSectionExit,
                exitActive: IntegrationStyles.columnsSectionExitActive,
              }}
              timeout={500}
              unmountOnExit
            >
              <div
                className={`${IntegrationStyles.columnsSection} ${IntegrationStyles.mobilePanel} ${activeMobilePanel === "columns" ? IntegrationStyles.mobilePanelActive : ""
                  }`}
              >
                <ColumnSearchList
                  columnsData={columnsData}
                  handleColumnClick={(col) => {
                    const alreadyExists = temporaryGroups.some(
                      (g) => g.column === col.column && g.fileName === col.fileName && g.nodeId === col.nodeId
                    );
                    if (!alreadyExists) setTemporaryGroups((prev) => [...prev, col]);
                    setEditTarget(null);

                    // no auto navigation; user can add multiple, then tap Mapping tab
                  }}

                  handleDragStart={(e, column) => {
                    e.dataTransfer.setData("column", JSON.stringify(column));
                  }}
                />
              </div>
            </CSSTransition>

            <CSSTransition
              in={!!columnsData.length}
              classNames={{
                enter: IntegrationStyles.columnMappingEnter,
                enterActive: IntegrationStyles.columnMappingEnterActive,
                exit: IntegrationStyles.columnMappingExit,
                exitActive: IntegrationStyles.columnMappingExitActive,
              }}
              timeout={500}
              unmountOnExit
            >
              <div
                className={`${IntegrationStyles.mobilePanel} ${activeMobilePanel === "mapping" ? IntegrationStyles.mobilePanelActive : ""
                  }`}
              >
                <ColumnMapping
                  columnsData={columnsData}
                  onMappingChange={handleMappingChange}
                  groups={temporaryGroups}
                  onSave={(...args) => {
                    const ok = handleSaveMappings(...args);
                    if (ok) setActiveMobilePanel("hierarchy");
                    return ok;
                  }}
                  onClear={handleClearMappingEditor}
                  schema={schema}
                  loadedDraft={loadedDraft}
                  onSuggestMappings={async (mode) => {
                    await handleSuggestMappings(mode);
                    setActiveMobilePanel("hierarchy");
                  }}
                  hasExistingMappings={mappings?.length > 0}
                  onGenerateMetadata={handleGenerateMetadata}
                  isGenerateMetadataLoading={isGenerateMetadataLoading}
                  generateMetadataProgress={generateMetadataProgress}
                />
              </div>
            </CSSTransition>

            <CSSTransition
              in={!!columnsData.length}
              classNames={{
                enter: IntegrationStyles.resultingSectionEnter,
                enterActive: IntegrationStyles.resultingSectionEnterActive,
                exit: IntegrationStyles.resultingSectionExit,
                exitActive: IntegrationStyles.resultingSectionExitActive,
              }}
              timeout={500}
              unmountOnExit
            >
              <div
                className={`${IntegrationStyles.mobilePanel} ${activeMobilePanel === "hierarchy" ? IntegrationStyles.mobilePanelActive : ""
                  }`}
              >
                <MappingsResult
                  mappings={mappings}
                  columnsData={columnsData}
                  deletedItems={deletedItems}
                  processingStatus={processingStatus}
                  onUndoDelete={handleUndoDelete}
                  onDeleteMapping={handleDeleteMapping}
                  onOpenFileMapper={() => setIsFileMapperOpen(true)}
                  formatValue={formatValue}
                  setMappings={setMappings}
                  onSelectMapping={(mappingIndex, mappingKey) => {
                    const nextId = `${mappingIndex}::${mappingKey}`;
                    if (selectedMappingId === nextId) return;
                    setSelectedMappingId(nextId);

                    const mapping = mappings[mappingIndex]?.[mappingKey];
                    if (!mapping) return;

                    const isOneHot = mapping?.mappingType === "one-hot";

                    const draft = isOneHot
                      ? buildOneHotDraft(mappingKey, mappings, columnsData)
                      : buildStandardDraft(mappingKey, mapping, columnsData);

                    if (draft) setLoadedDraft(draft);

                    if (isOneHot) {
                      const base = mappingKey.includes("_")
                        ? mappingKey.slice(0, mappingKey.lastIndexOf("_"))
                        : mappingKey;
                      setEditTarget({ index: mappingIndex, key: mappingKey, type: "one-hot", base });
                    } else {
                      setEditTarget({ index: mappingIndex, key: mappingKey, type: "standard" });
                    }

                    if (isMobile) setActiveMobilePanel("mapping");
                  }}

                />
              </div>
            </CSSTransition>
          </>
        ) : (
          /* DESKTOP (restore original layout) */
          <>
            <CSSTransition
              in={!!columnsData.length}
              classNames={{
                enter: IntegrationStyles.columnsSectionEnter,
                enterActive: IntegrationStyles.columnsSectionEnterActive,
                exit: IntegrationStyles.columnsSectionExit,
                exitActive: IntegrationStyles.columnsSectionExitActive,
              }}
              timeout={500}
              unmountOnExit
            >
              <div className={IntegrationStyles.columnsSection}>
                <ColumnSearchList
                  columnsData={columnsData}
                  handleColumnClick={(col) => {
                    const alreadyExists = temporaryGroups.some(
                      (g) => g.column === col.column && g.fileName === col.fileName && g.nodeId === col.nodeId
                    );
                    if (!alreadyExists) setTemporaryGroups((prev) => [...prev, col]);
                    setEditTarget(null);

                    // no auto navigation; user can add multiple, then tap Mapping tab
                  }}

                  handleDragStart={(e, column) => {
                    e.dataTransfer.setData("column", JSON.stringify(column));
                  }}
                />
              </div>
            </CSSTransition>

            <CSSTransition
              in={!!columnsData.length}
              classNames={{
                enter: IntegrationStyles.columnMappingEnter,
                enterActive: IntegrationStyles.columnMappingEnterActive,
                exit: IntegrationStyles.columnMappingExit,
                exitActive: IntegrationStyles.columnMappingExitActive,
              }}
              timeout={500}
              unmountOnExit
            >
              <ColumnMapping
                columnsData={columnsData}
                onMappingChange={handleMappingChange}
                groups={temporaryGroups}
                onSave={(...args) => {
                  const ok = handleSaveMappings(...args);
                  if (ok) setActiveMobilePanel("hierarchy");
                  return ok;
                }}
                schema={schema}
                loadedDraft={loadedDraft}
                onSuggestMappings={handleSuggestMappings}
                hasExistingMappings={mappings?.length > 0}
                onGenerateMetadata={handleGenerateMetadata}
                isGenerateMetadataLoading={isGenerateMetadataLoading}
                generateMetadataProgress={generateMetadataProgress}
              />
            </CSSTransition>
            <CSSTransition
              in={!!columnsData.length}
              classNames={{
                enter: IntegrationStyles.resultingSectionEnter,
                enterActive: IntegrationStyles.resultingSectionEnterActive,
                exit: IntegrationStyles.resultingSectionExit,
                exitActive: IntegrationStyles.resultingSectionExitActive,
              }}
              timeout={500}
              unmountOnExit
            >
              <MappingsResult
                mappings={mappings}
                columnsData={columnsData}
                deletedItems={deletedItems}
                processingStatus={processingStatus}
                onUndoDelete={handleUndoDelete}
                onDeleteMapping={handleDeleteMapping}
                onOpenFileMapper={() => setIsFileMapperOpen(true)}
                formatValue={formatValue}
                setMappings={setMappings}
                onSelectMapping={(mappingIndex, mappingKey) => {
                  const nextId = `${mappingIndex}::${mappingKey}`;
                  if (selectedMappingId === nextId) return;
                  setSelectedMappingId(nextId);

                  const mapping = mappings[mappingIndex]?.[mappingKey];
                  if (!mapping) return;

                  const isOneHot = mapping?.mappingType === "one-hot";

                  const draft = isOneHot
                    ? buildOneHotDraft(mappingKey, mappings, columnsData)
                    : buildStandardDraft(mappingKey, mapping, columnsData);

                  if (draft) setLoadedDraft(draft);

                  if (isOneHot) {
                    const base = mappingKey.includes("_")
                      ? mappingKey.slice(0, mappingKey.lastIndexOf("_"))
                      : mappingKey;
                    setEditTarget({ index: mappingIndex, key: mappingKey, type: "one-hot", base });
                  } else {
                    setEditTarget({ index: mappingIndex, key: mappingKey, type: "standard" });
                  }

                  if (isMobile) setActiveMobilePanel("mapping");
                }}

              />
            </CSSTransition>
          </>
        )}
      </div>


      {columnsData.length > 0 && (
        <SchemaTray
          reduced={true}
          error={schemaError}
          setError={setSchemaError}
          externalSchema={schema}
          onSchemaChange={(newSchema) => setSchema(newSchema)}
          onRemoveExternalSchema={handleRemoveExternalSchema}
          nodesFetched
        />
      )}

      <ToastContainer
        autoClose={2000}
        hideProgressBar={true}
        className={IntegrationStyles.toastContainer}
        toastClassName={IntegrationStyles.toast}
      />
    </div>
  );
}

export default Integration;
