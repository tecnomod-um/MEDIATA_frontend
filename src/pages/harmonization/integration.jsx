import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { CSSTransition } from "react-transition-group";
import { ToastContainer, toast } from "react-toastify";
import { getNodeElements, fetchElementFile, setParseConfigs, getParseConfigsStatus, getParseConfigsResult, fetchSchemaFromBackend, suggestMappings, enrichMappingsStart, getEnrichMappingsStatus, getEnrichMappingsResult } from "../../util/petitionHandler";
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
import { buildMappingSpec } from "../../util/mappingSpec";
import UploadedMappingsResolutionModal from "../../components/Integration/UploadedMappingsResolutionModal/uploadedMappingsResolutionModal";
import {
  normalizeUploadedSpec,
  collectSpecSources,
  rebuildMappingsFromSpec,
  applyUploadedSpecResolutions,
} from "../../util/uploadedMappingSpec";
import {
  fetchLiveElementFilesByNode,
  analyzeUploadedSpecAvailabilityLive,
  checkReplacementFileCompatibility,
} from "../../util/uploadedMappingResolution";
import {
  parseCSV,
  formatValue,
  extractHierarchy,
  normalizeEnrichStep,
  mergeColumnsData as mergeColumnsDataUtil,
  buildGroupsFromMapping as buildGroupsFromMappingUtil,
  buildStandardDraft as buildStandardDraftUtil,
  collectOneHotFamily as collectOneHotFamilyUtil,
  buildOneHotDraft as buildOneHotDraftUtil,
} from "./integrationUtils";

function PanelWrapper({ isMobile, panel, activeMobilePanel, styles, children }) {
  if (!isMobile) return children;
  return (
    <div
      className={`${styles.mobilePanel}${
        activeMobilePanel === panel ? ` ${styles.mobilePanelActive}` : ""
      }`}
    >
      {children}
    </div>
  );
}

function reconcileLoadedMappingsWithColumnsData(mappings, columnsData) {
  const availableColumns = new Set(
    (columnsData || []).map((col) => `${col.nodeId}::${col.fileName}::${col.column}`)
  );

  return (mappings || []).map((mappingObj) => {
    const nextObj = {};

    Object.entries(mappingObj || {}).forEach(([mappingKey, mapping]) => {
      const nextGroups = (mapping?.groups || []).map((group) => ({
        ...group,
        values: (group?.values || []).map((valueObj) => ({
          ...valueObj,
          mapping: (valueObj?.mapping || []).filter((m) =>
            availableColumns.has(`${m.nodeId}::${m.fileName}::${m.groupColumn}`)
          ),
        })),
      }));

      nextObj[mappingKey] = {
        ...mapping,
        groups: nextGroups,
        columns: Array.from(
          new Set(
            nextGroups.flatMap((g) =>
              (g?.values || []).flatMap((v) =>
                (v?.mapping || []).map((m) => m.groupColumn)
              )
            )
          )
        ),
      };
    });

    return nextObj;
  });
}

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
  const [loadedDraft, setLoadedDraft] = useState(null);
  const [selectedMappingId, setSelectedMappingId] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [activeMobilePanel, setActiveMobilePanel] = useState("mapping");
  const [isMobile, setIsMobile] = useState(false);
  const [isGenerateMetadataLoading, setIsGenerateMetadataLoading] = useState(false);
  const [generateMetadataProgress, setGenerateMetadataProgress] = useState(0);

  const [isUploadResolutionOpen, setIsUploadResolutionOpen] = useState(false);
  const [pendingUploadSpec, setPendingUploadSpec] = useState(null);
  const [pendingUploadMissingRefs, setPendingUploadMissingRefs] = useState([]);
  const [pendingUploadRequiredColumnsBySource, setPendingUploadRequiredColumnsBySource] = useState({});

  const hasProcessedElementFilesRef = useRef(false);
  const enrichPollRef = useRef(null);
  const lastEnrichMsgRef = useRef("");
  const lastEnrichStepRef = useRef("");
  const enrichToastIdRef = useRef(null);
  const parseToastIdRef = useRef(null);

  const refreshElementFileListFromBackend = useCallback(async () => {
    const liveFilesByNode = await fetchLiveElementFilesByNode(selectedNodes);

    const nextElementFileList = Array.from(liveFilesByNode.values()).map((entry) => ({
      nodeId: entry.nodeId,
      nodeName: entry.nodeName,
      files: entry.files,
    }));

    setElementFileList(nextElementFileList);

    return { liveFilesByNode, nextElementFileList };
  }, [selectedNodes]);

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

  const mergeColumnsData = useCallback(
    (existingData, newData) => mergeColumnsDataUtil(existingData, newData),
    []
  );

  const showOrUpdateParseToast = useCallback((msg, pct) => {
    const text = msg?.trim() ? `${msg} (${pct}%)` : `Applying mappings… (${pct}%)`;
    const id = parseToastIdRef.current;

    if (!id || !toast.isActive(id)) {
      parseToastIdRef.current = toast.info(text, {
        autoClose: false,
        closeButton: false,
        draggable: false,
        toastId: "parse-progress",
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
  }, []);

  const closeParseToast = useCallback(() => {
    if (parseToastIdRef.current != null) {
      toast.dismiss(parseToastIdRef.current);
      parseToastIdRef.current = null;
    }
  }, []);

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
  }, [isGenerateMetadataLoading, mappings, schema]);

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
    if (hasProcessedElementFilesRef.current) return;
    if (!location.state?.elementFiles?.length) return;
    hasProcessedElementFilesRef.current = true;
    const elementFiles = location.state.elementFiles;
    const nodeMapping = {};

    for (const { nodeId, fileName } of elementFiles) {
      if (!nodeMapping[nodeId]) nodeMapping[nodeId] = [];
      nodeMapping[nodeId].push(fileName);
    }

    handleProcessSelectedElements(nodeMapping);
  }, [location.state, handleProcessSelectedElements]);

  const handleProcessMappings = async (selectedDatasets, currentMappings, cleanOpts) => {
    setProcessingStatus("processing");

    try {
      const nodeFileMappings = {};
      let totalTargetDatasets = 0;

      for (const [sourceKey, datasets] of Object.entries(selectedDatasets)) {
        if (!Array.isArray(datasets) || datasets.length === 0) continue;

        const sep = String(sourceKey).indexOf("::");
        if (sep < 0) continue;

        const nodeId = String(sourceKey).slice(0, sep);
        const fileName = String(sourceKey).slice(sep + 2);

        if (!nodeId || !fileName) continue;

        if (!nodeFileMappings[nodeId]) nodeFileMappings[nodeId] = {};
        nodeFileMappings[nodeId][fileName] = datasets;
        totalTargetDatasets += datasets.length;
      }

      const jobs = [];

      const mappingSpec = buildMappingSpec({
        mappings: currentMappings,
        schema,
        selectedDatasets,
      });

      for (const node of selectedNodes) {
        const fileMappingsForNode = nodeFileMappings[node.nodeId];
        if (!fileMappingsForNode || Object.keys(fileMappingsForNode).length === 0) continue;

        updateNodeAxiosBaseURL(node.serviceUrl);

        const payload = {
          fileMappings: fileMappingsForNode,
          mappingSpec,
          cleaningOptions: cleanOpts,
        };

        const start = await setParseConfigs(payload);

        if (start?.status !== 202 || !start?.data?.jobId) {
          throw new Error(
            start?.data?.message || `Failed to start parsing job for node ${node.name || node.nodeId}`
          );
        }

        jobs.push({
          node,
          jobId: start.data.jobId,
        });
      }

      if (!jobs.length) {
        setProcessingStatus("idle");
        throw new Error("No datasets selected.");
      }

      showOrUpdateParseToast(
        `Starting processing for ${totalTargetDatasets} dataset${totalTargetDatasets !== 1 ? "s" : ""}`,
        0
      );

      const nodeProgress = new Map(
        jobs.map(({ jobId, node }) => [
          jobId,
          {
            percent: 0,
            message: `Queued on ${node.name || node.nodeId}`,
          },
        ])
      );

      const computeOverallPercent = () => {
        const values = Array.from(nodeProgress.values());
        if (!values.length) return 0;
        const total = values.reduce((acc, x) => acc + (Number(x.percent) || 0), 0);
        return Math.round(total / values.length);
      };

      for (const { node, jobId } of jobs) {
        let finished = false;

        while (!finished) {
          updateNodeAxiosBaseURL(node.serviceUrl);

          const st = await getParseConfigsStatus(jobId);
          const pct = Math.max(0, Math.min(100, Number(st?.percent) || 0));
          const state = String(st?.state || "").toUpperCase();

          let progressMessage = `Processing on ${node.name || node.nodeId}`;
          if (state === "DONE") {
            progressMessage = `Finalizing on ${node.name || node.nodeId}`;
          } else if (st?.message && state !== "DONE") {
            progressMessage = String(st.message).trim();
          }

          nodeProgress.set(jobId, {
            percent: pct,
            message: progressMessage,
          });

          showOrUpdateParseToast(progressMessage, computeOverallPercent());

          if (state === "ERROR") {
            throw new Error(st?.message || `Processing failed on ${node.name || node.nodeId}`);
          }

          if (state === "DONE") {
            let res = null;
            let attempts = 0;

            while (attempts < 10) {
              updateNodeAxiosBaseURL(node.serviceUrl);
              res = await getParseConfigsResult(jobId);

              if (res?.status === 200) break;
              if (res?.status !== 409) break;

              attempts += 1;
              await new Promise((r) => setTimeout(r, 300));
            }

            if (res?.status !== 200) {
              throw new Error(
                res?.data?.message ||
                `Processed job finished but no result was available for ${node.name || node.nodeId}`
              );
            }

            nodeProgress.set(jobId, {
              percent: 100,
              message: `Finished on ${node.name || node.nodeId}`,
            });

            showOrUpdateParseToast(
              `Finished on ${node.name || node.nodeId}`,
              computeOverallPercent()
            );

            finished = true;
            break;
          }

          await new Promise((r) => setTimeout(r, 500));
        }
      }

      closeParseToast();
      setProcessingStatus("success");
      toast.success("Files processed successfully.");
      return { ok: true };
    } catch (error) {
      console.error("Error processing mappings:", error);
      closeParseToast();
      setProcessingStatus("error");
      toast.error(error?.message || "Error processing files.");
      throw error;
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

  const handleSaveMappings = (groups, unionName, customValues, removeFromHierarchy, isOneHotMapping, unionMeta) => {
    const norm = (s) => String(s ?? "").trim();
    const normalizedUnion = norm(unionName);
    const normalizedCustomValues = (customValues || []).map((cv) => ({
      ...cv,
      name: norm(cv.name),
    }));

    const isEditing = !!editTarget && typeof editTarget.index === "number" &&
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

    const shouldCheckDup = (() => {
      if (!isEditing) return true;
      if (isOneHotMapping) return normalizedUnion !== oldOneHotBase;
      return normalizedUnion !== norm(editTarget.key);
    })();

    const keysRemovedByThisSave = new Set(
      removeFromHierarchy ? (groups || []).map((g) => String(g.column)) : []
    );

    const mappingKeyExistsExcept = (key, excludeIndex, excludeKeysSet) => {
      return (mappings || []).some((obj, idx) => {
        return Object.keys(obj || {}).some((k) => {
          if (idx === excludeIndex && excludeKeysSet?.has(k)) return false;
          if (keysRemovedByThisSave.has(k)) return false;
          return k === key;
        });
      });
    };

    const oneHotAnyExistsExcept = (base, cvs, excludeIndex, excludeKeysSet) => {
      return (cvs || []).some((cv) => mappingKeyExistsExcept(`${base}_${cv.name}`, excludeIndex, excludeKeysSet));
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

    if (isOneHotMapping) {
      const newFamily = {};
      normalizedCustomValues.forEach((cv) => {
        const columnName = `${normalizedUnion}_${cv.name}`;
        newFamily[columnName] = {
          mappingType: "one-hot",
          fileName: "custom_mapping",
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

  const buildGroupsFromMapping = useCallback(
    (mapping, columnsData) => buildGroupsFromMappingUtil(mapping, columnsData),
    []
  );

  const buildStandardDraft = useCallback(
    (mappingKey, mapping, columnsData) => buildStandardDraftUtil(mappingKey, mapping, columnsData),
    []
  );

  const collectOneHotFamily = useCallback(
    (mappings, base) => collectOneHotFamilyUtil(mappings, base),
    []
  );

  const buildOneHotDraft = useCallback(
    (selectedKey, mappings, columnsData) => buildOneHotDraftUtil(selectedKey, mappings, columnsData),
    []
  );

  const loadReferencedElementFiles = useCallback(
    async (sourceRefs, providedElementFileList = null) => {
      if (!Array.isArray(sourceRefs) || sourceRefs.length === 0) {
        return columnsData;
      }

      const currentElementFileList = providedElementFileList || elementFileList;

      const existing = new Set(
        columnsData.map((c) => `${c.nodeId}::${c.fileName}`)
      );

      const missingRefs = sourceRefs.filter(
        ({ nodeId, fileName }) => !existing.has(`${nodeId}::${fileName}`)
      );

      if (missingRefs.length === 0) {
        return columnsData;
      }

      const nodeById = new Map(
        (selectedNodes || []).map((node) => [String(node.nodeId), node])
      );

      const availableFilesByNode = new Map(
        (currentElementFileList || []).map((entry) => [
          String(entry.nodeId),
          new Set(entry.files || []),
        ])
      );

      const missingSelectedNodes = [];
      const missingFiles = [];

      missingRefs.forEach(({ nodeId, fileName }) => {
        if (!nodeById.has(String(nodeId))) {
          missingSelectedNodes.push(nodeId);
          return;
        }

        const fileSet = availableFilesByNode.get(String(nodeId));
        if (!fileSet || !fileSet.has(fileName)) {
          missingFiles.push(`${nodeId}::${fileName}`);
        }
      });

      if (missingSelectedNodes.length > 0) {
        throw new Error(
          `The uploaded spec references node ids that are not currently selected: ${Array.from(
            new Set(missingSelectedNodes)
          ).join(", ")}`
        );
      }

      if (missingFiles.length > 0) {
        throw new Error(
          `The uploaded spec references element files that were not found in the selected nodes: ${missingFiles.join(
            ", "
          )}`
        );
      }

      let mergedCols = [...columnsData];
      const fileColors = generateDistinctColors(missingRefs.length);
      let colorIndex = 0;

      for (const { nodeId, fileName } of missingRefs) {
        const node = nodeById.get(String(nodeId));
        updateNodeAxiosBaseURL(node.serviceUrl);

        const text = await fetchElementFile(fileName);
        const parsed = parseCSV(text);

        parsed.forEach((col) => {
          col.color = fileColors[colorIndex];
          col.fileName = fileName;
          col.nodeId = nodeId;
        });

        colorIndex += 1;
        mergedCols = mergeColumnsData(mergedCols, parsed);
      }

      return mergedCols;
    },
    [columnsData, elementFileList, selectedNodes, mergeColumnsData]
  );

  const applyUploadedSpecToState = useCallback(
    async (specToLoad, providedElementFileList = null) => {
      const sourceRefs = collectSpecSources(specToLoad);

      if (sourceRefs.length === 0) {
        throw new Error("The uploaded spec does not reference any source element files.");
      }

      const nextColumnsData = await loadReferencedElementFiles(
        sourceRefs,
        providedElementFileList
      );

      const rebuiltMappings = rebuildMappingsFromSpec(specToLoad);
      const nextMappings = reconcileLoadedMappingsWithColumnsData(
        rebuiltMappings,
        nextColumnsData
      );

      if (!nextMappings.length) {
        throw new Error("The uploaded spec did not produce any loadable mappings.");
      }

      setColumnsData(nextColumnsData);
      setMappings(nextMappings);
      setTemporaryGroups([]);
      setDeletedItems([]);
      setLoadedDraft(null);
      setSelectedMappingId(null);
      setEditTarget(null);

      if (specToLoad.targetSchema) {
        setSchema(specToLoad.targetSchema);
      }

      if (isMobile) {
        setActiveMobilePanel("hierarchy");
      }

      toast.success("Mapping spec loaded successfully.");
    },
    [isMobile, loadReferencedElementFiles]
  );

  const handleConfirmUploadResolution = useCallback(
    async (resolutionMap) => {
      try {
        const rewrittenSpec = applyUploadedSpecResolutions(
          pendingUploadSpec,
          resolutionMap
        );

        const { nextElementFileList } = await refreshElementFileListFromBackend();

        setIsUploadResolutionOpen(false);
        setPendingUploadSpec(null);
        setPendingUploadMissingRefs([]);
        setPendingUploadRequiredColumnsBySource({});

        await applyUploadedSpecToState(rewrittenSpec, nextElementFileList);
      } catch (error) {
        console.error("Failed to resolve uploaded mappings:", error);
        toast.error(error?.message || "Failed to resolve uploaded mapping spec.");
      }
    },
    [pendingUploadSpec, refreshElementFileListFromBackend, applyUploadedSpecToState]
  );

  const handleCloseUploadResolution = useCallback(() => {
    setIsUploadResolutionOpen(false);
    setPendingUploadSpec(null);
    setPendingUploadMissingRefs([]);
    setPendingUploadRequiredColumnsBySource({});
  }, []);

  const handleCheckUploadResolutionCompatibility = useCallback(
    async (sourceId, replacementNodeId, replacementFileName) => {
      return checkReplacementFileCompatibility({
        selectedNodes,
        sourceId,
        replacementNodeId,
        replacementFileName,
        requiredColumnsBySource: pendingUploadRequiredColumnsBySource,
      });
    },
    [selectedNodes, pendingUploadRequiredColumnsBySource]
  );

  const handleUploadMappingsSpec = useCallback(
    async (uploadedSpec) => {
      try {
        const spec = normalizeUploadedSpec(uploadedSpec);
        const sourceRefs = collectSpecSources(spec);

        if (sourceRefs.length === 0) {
          throw new Error("The uploaded spec does not reference any source element files.");
        }

        const { liveFilesByNode, nextElementFileList } = await refreshElementFileListFromBackend();

        const availability = await analyzeUploadedSpecAvailabilityLive(
          spec,
          selectedNodes,
          liveFilesByNode
        );

        if (availability.requiresResolution) {
          setPendingUploadSpec(spec);
          setPendingUploadMissingRefs(availability.missing);
          setPendingUploadRequiredColumnsBySource(availability.requiredColumnsBySource || {});
          setIsUploadResolutionOpen(true);
          return;
        }

        await applyUploadedSpecToState(spec, nextElementFileList);
      } catch (error) {
        console.error("Failed to load uploaded mappings:", error);
        toast.error(error?.message || "Failed to load uploaded mapping spec.");
      }
    },
    [selectedNodes, refreshElementFileListFromBackend, applyUploadedSpecToState]
  );

  const handleColumnClick = useCallback(
    (col) => {
      const alreadyExists = temporaryGroups.some(
        (g) => g.column === col.column && g.fileName === col.fileName && g.nodeId === col.nodeId
      );
      if (!alreadyExists) setTemporaryGroups((prev) => [...prev, col]);
      setEditTarget(null);
    },
    [temporaryGroups]
  );

  const handleDragStart = useCallback((e, column) => {
    e.dataTransfer.setData("column", JSON.stringify(column));
  }, []);

  // After a successful save, advance to the hierarchy panel on mobile.
  const handleSave = useCallback(
    (...args) => {
      const ok = handleSaveMappings(...args);
      if (ok) setActiveMobilePanel("hierarchy");
      return ok;
    },
    [handleSaveMappings]
  );

  // After suggesting mappings, advance to the hierarchy panel on mobile.
  const handleSuggestAndNavigate = useCallback(
    async (mode) => {
      await handleSuggestMappings(mode);
      if (isMobile) setActiveMobilePanel("hierarchy");
    },
    [handleSuggestMappings, isMobile]
  );

  // After selecting a mapping, advance to the mapping editor panel on mobile.
  const handleSelectMapping = useCallback(
    (mappingIndex, mappingKey) => {
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
    },
    [selectedMappingId, mappings, columnsData, isMobile, buildOneHotDraft, buildStandardDraft]
  );

  return (
    <div className={IntegrationStyles.pageContainer}>
      <FileMapperModal
        isOpen={isFileMapperOpen}
        closeModal={() => {
          if (processingStatus === "processing") return;
          setIsFileMapperOpen(false);
        }}
        mappings={mappings}
        columnsData={columnsData}
        nodes={selectedNodes}
        onSend={handleProcessMappings}
      />
      {isUploadResolutionOpen && (
        <UploadedMappingsResolutionModal
          isOpen={isUploadResolutionOpen}
          closeModal={handleCloseUploadResolution}
          missingRefs={pendingUploadMissingRefs}
          onConfirm={handleConfirmUploadResolution}
          onCheckCompatibility={handleCheckUploadResolutionCompatibility}
        />
      )}

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
        {/* Mobile tab navigation — only rendered when on a mobile viewport */}
        {isMobile && columnsData.length > 0 && (
          <div className={IntegrationStyles.mobileNav} role="tablist" aria-label="Integration panels">
            {["columns", "mapping", "hierarchy"].map((panel) => (
              <button
                key={panel}
                type="button"
                role="tab"
                aria-selected={activeMobilePanel === panel}
                className={`${IntegrationStyles.mobileNavBtn}${
                  activeMobilePanel === panel ? ` ${IntegrationStyles.mobileNavBtnActive}` : ""
                }`}
                onClick={() => setActiveMobilePanel(panel)}
              >
                {panel.charAt(0).toUpperCase() + panel.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Columns panel */}
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
            className={`${IntegrationStyles.columnsSection}${
              isMobile
                ? ` ${IntegrationStyles.mobilePanel}${
                    activeMobilePanel === "columns" ? ` ${IntegrationStyles.mobilePanelActive}` : ""
                  }`
                : ""
            }`}
          >
            <ColumnSearchList
              columnsData={columnsData}
              handleColumnClick={handleColumnClick}
              handleDragStart={handleDragStart}
            />
          </div>
        </CSSTransition>

        {/* Column mapping editor panel */}
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
          <PanelWrapper
            isMobile={isMobile}
            panel="mapping"
            activeMobilePanel={activeMobilePanel}
            styles={IntegrationStyles}
          >
            <ColumnMapping
              columnsData={columnsData}
              onMappingChange={handleMappingChange}
              groups={temporaryGroups}
              onSave={handleSave}
              {...(isMobile && { onClear: handleClearMappingEditor })}
              schema={schema}
              loadedDraft={loadedDraft}
              onSuggestMappings={handleSuggestAndNavigate}
              hasExistingMappings={mappings?.length > 0}
              onGenerateMetadata={handleGenerateMetadata}
              isGenerateMetadataLoading={isGenerateMetadataLoading}
              generateMetadataProgress={generateMetadataProgress}
            />
          </PanelWrapper>
        </CSSTransition>

        {/* Mappings hierarchy / results panel */}
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
          <PanelWrapper
            isMobile={isMobile}
            panel="hierarchy"
            activeMobilePanel={activeMobilePanel}
            styles={IntegrationStyles}
          >
            <MappingsResult
              mappings={mappings}
              schema={schema}
              columnsData={columnsData}
              deletedItems={deletedItems}
              processingStatus={processingStatus}
              onUndoDelete={handleUndoDelete}
              onDeleteMapping={handleDeleteMapping}
              onOpenFileMapper={() => setIsFileMapperOpen(true)}
              formatValue={formatValue}
              setMappings={setMappings}
              onUploadMappings={handleUploadMappingsSpec}
              onSelectMapping={handleSelectMapping}
            />
          </PanelWrapper>
        </CSSTransition>
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
