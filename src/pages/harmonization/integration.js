import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { CSSTransition } from "react-transition-group";
import { ToastContainer, toast } from "react-toastify";
import { getNodeElements, fetchElementFile, setParseConfigs, fetchSchemaFromBackend, suggestMappings } from "../../util/petitionHandler";
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

  const handleSaveMappings = (groups, unionName, customValues, removeFromHierarchy, isOneHotMapping, unionMeta) => {
    const norm = (s) => String(s ?? "").trim();

    const normalizedUnion = norm(unionName);
    const normalizedCustomValues = (customValues || []).map((cv) => ({ ...cv, name: norm(cv.name) }));

    if (isOneHotMapping) {
      if (oneHotAnyExists(normalizedUnion, normalizedCustomValues)) {
        toast.error("Mapping already exists in the hierarchy.");
        return;
      }
    } else {
      if (mappingKeyExists(normalizedUnion)) {
        toast.error("Mapping already exists in the hierarchy.");
        return;
      }
    }

    if (isOneHotMapping) {
      const newMappings = {};
      normalizedCustomValues.forEach((cv) => {
        const columnName = `${normalizedUnion}_${cv.name}`;
        newMappings[columnName] = {
          mappingType: "one-hot",
          fileName: "custom_mapping",
          columns: groups.map((g) => g.column),
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
                {
                  name: "0",
                  mapping: [],
                },
              ],
            },
          ],
        };
      });

      if (removeFromHierarchy) {
        const updated = mappings.map((m) => {
          const newMap = { ...m };
          groups.forEach((group) => {
            delete newMap[group.column];
          });
          return newMap;
        });
        setMappings([...updated, newMappings]);
      } else {
        setMappings((prev) => [...prev, newMappings]);
      }
    } else {
      const mergedValues =
        normalizedCustomValues.length > 0
          ? normalizedCustomValues
          : groups.flatMap((g) =>
            g.values.map((val) => ({
              name: val,
              mapping: [
                {
                  groupKey: `${g.nodeId}::${g.fileName}::${g.column}`,
                  groupColumn: g.column,
                  fileName: g.fileName,
                  nodeId: g.nodeId,
                  value: val,
                },
              ],
            }))
          );

      const newMapping = {
        [normalizedUnion]: {
          mappingType: "standard",
          fileName: "custom_mapping",
          columns: groups.map((g) => g.column),
          terminology: unionMeta?.terminology || "",
          description: unionMeta?.description || "",
          groups: [
            {
              column: normalizedUnion,
              values: mergedValues.map((v) => ({
                ...v,
                terminology: v.terminology || "",
                description: v.description || "",
              })),
            },
          ],
        },
      };

      if (removeFromHierarchy) {
        const updated = mappings.map((m) => {
          const newMap = { ...m };
          groups.forEach((group) => {
            delete newMap[group.column];
          });
          return newMap;
        });
        setMappings([...updated, newMapping]);
      } else {
        setMappings((prev) => [...prev, newMapping]);
      }
    }

    setTemporaryGroups([]);
    setLoadedDraft(null);
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
                if (!alreadyExists) setTemporaryGroups([...temporaryGroups, col]);
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
            onSave={handleSaveMappings}
            schema={schema}
            loadedDraft={loadedDraft}
            onSuggestMappings={handleSuggestMappings}
            hasExistingMappings={mappings?.length > 0}
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
              const mapping = mappings[mappingIndex]?.[mappingKey];
              if (!mapping) return;

              const draft =
                mapping.mappingType === "one-hot"
                  ? buildOneHotDraft(mappingKey, mappings, columnsData)
                  : buildStandardDraft(mappingKey, mapping, columnsData);

              if (draft) setLoadedDraft(draft);
            }}
          />
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
