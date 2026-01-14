// Integration page for data mapping and harmonization
import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { CSSTransition } from "react-transition-group";
import { ToastContainer, toast } from "react-toastify";
import { getNodeElements, fetchElementFile, setParseConfigs, fetchSchemaFromBackend } from "../../util/petitionHandler";
import { updateNodeAxiosBaseURL } from "../../util/nodeAxiosSetup";
import { useNode } from "../../context/nodeContext";
import IntegrationStyles from "./integration.module.css";
import ColumnMapping from "../../components/Integration/ColumnMapping/columnMapping";
import ColumnSearch from "../../components/Integration/ColumnSearch/columnSearch";
import FileMapperModal from "../../components/Integration/FileMapperModal/fileMapperModal";
import FilePicker from "../../components/Common/FilePicker/filePicker";
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
    if (processingStatus === "success")
      toast.success("Files processed successfully.");
    else if (processingStatus === "error")
      toast.error("An error occurred during processing.");
  }, [processingStatus]);

  // Simple CSV parser => array of { column, values }
  const parseCSV = (text) => {
    const lines = text.trim().split("\n");
    return lines.map((line) => {
      const [column, ...values] = line.split(",");
      return { column, values };
    });
  };

  // Merge new columns data with existing columns
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

  // Initialize mapping structure for each column in the newly loaded CSV file
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

  // ------------------------------
  // 2. Process each node’s selected files
  //    'selectedFilenamesMapping' => { nodeId: ["file1", "file2"], ... }
  // ------------------------------
  const handleProcessSelectedElements = useCallback(
    async (selectedFilenamesMapping) => {
      setProcessingStatus("processing");

      try {
        let mergedCols = [...columnsData];

        // Collect all selected filenames for color assignment
        const allSelectedFiles = [];
        selectedNodes.forEach((node) => {
          const filesForNode = selectedFilenamesMapping[node.nodeId] || [];
          filesForNode.forEach((f) => allSelectedFiles.push(f));
        });
        const fileColors = generateDistinctColors(allSelectedFiles.length);
        let colorIndex = 0;

        // For each node, fetch the text of each selected file
        await Promise.all(
          selectedNodes.map(async (node) => {
            const filesForNode = selectedFilenamesMapping[node.nodeId] || [];
            if (filesForNode.length === 0) return;

            // Switch axios baseURL to the node’s service
            updateNodeAxiosBaseURL(node.serviceUrl);

            const fileTexts = await Promise.all(
              filesForNode.map(async (filename) => {
                const text = await fetchElementFile(filename);
                return { filename, text };
              })
            );

            // Parse & merge each file’s columns
            fileTexts.forEach((fileObj) => {
              const { filename, text } = fileObj;
              const parsed = parseCSV(text);

              // Assign color and nodeId to each column
              parsed.forEach((col) => {
                col.color = fileColors[colorIndex];
                col.fileName = filename;
                col.nodeId = node.nodeId; // Added nodeId assignment
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
    [
      columnsData,
      selectedNodes,
      mergeColumnsData,
      initializeMappings
    ]
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

  // Send mappings to the backend for processing
  const handleProcessMappings = async (selectedDatasets, currentMappings, cleanOpts) => {
    setProcessingStatus("processing");

    try {
      // 1. Build a lookup of nodeId => { fileName => [datasets] }
      const nodeFileMappings = {}; // e.g. { "nodeA": { "Barthel.csv": ["dsA"], ... } }

      for (const fileName of Object.keys(selectedDatasets)) {
        const col = columnsData.find((c) => c.fileName === fileName);
        if (!col) continue;

        const nodeId = col.nodeId;
        if (!nodeFileMappings[nodeId])
          nodeFileMappings[nodeId] = {};

        nodeFileMappings[nodeId][fileName] = selectedDatasets[fileName];
      }
      // 2. For each node that has some file mappings, set baseURL and call setParseConfigs
      for (const node of selectedNodes) {
        const fileMappingsForNode = nodeFileMappings[node.nodeId];
        if (!fileMappingsForNode) continue;
        updateNodeAxiosBaseURL(node.serviceUrl);

        const payload = {
          fileMappings: JSON.stringify(fileMappingsForNode),
          configs: JSON.stringify(currentMappings),
          cleaningOptions: cleanOpts
        };
        console.log("[handleProcessMappings] payload for node", node.nodeId, payload);
        await setParseConfigs(payload);
      }

      // If all requests succeed
      setProcessingStatus("success");
      return "All parse requests done";
    } catch (error) {
      console.error("Error processing mappings:", error);
      setProcessingStatus("error");
      return "Error occurred";
    }
  };

  // Callback that receives grouping info from ColumnMapping
  const handleMappingChange = (newGroups) => {
    setTemporaryGroups(newGroups);
  };

  const handleSaveMappings = (groups, unionName, customValues, removeFromHierarchy, isOneHotMapping) => {
    if (isOneHotMapping) {
      const newMappings = {};
      customValues.forEach((cv) => {
        const columnName = `${unionName}_${cv.name}`;
        newMappings[columnName] = {
          mappingType: "one-hot",
          fileName: "custom_mapping",
          columns: groups.map((g) => g.column),
          groups: [
            {
              column: columnName,
              values: [
                {
                  name: "1",
                  mapping: cv.mapping,
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
        customValues.length > 0
          ? customValues
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
        [unionName]: {
          mappingType: "standard",
          fileName: "custom_mapping",
          // Keep track of which original columns are merged
          columns: groups.map((g) => g.column),
          // A single group object, with all merged values
          groups: [
            {
              column: unionName,
              values: mergedValues,
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
    // Clear the drop area
    setTemporaryGroups([]);
  };


  // Delete a single mapping
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

  // Undo last delete
  const handleUndoDelete = () => {
    if (deletedItems.length > 0) {
      const lastDeletedItem = deletedItems[deletedItems.length - 1];
      const { index, key, mapping } = lastDeletedItem;

      const updatedMappings = mappings.map((mappingObj, idx) => {
        if (idx === index) {
          return { ...mappingObj, [key]: mapping };
        }
        return mappingObj;
      });

      setMappings(updatedMappings);
      setDeletedItems(deletedItems.slice(0, -1));
    }
  };

  // Format value for date or numeric range
  const formatValue = (value, type) => {
    if (type === "date") {
      const date = new Date(value);
      return date instanceof Date && !isNaN(date)
        ? date.toISOString().split("T")[0]
        : "";
    }
    return value !== undefined && value !== null ? value.toString() : "";
  };

  // Fetch external schema if needed
  useEffect(() => {
    (async function loadSchema() {
      try {
        const result = await fetchSchemaFromBackend();
        if (result && result.schema) {
          setSchema(result.schema);
        }
      } catch (err) {
        console.error("Failed to fetch schema from backend in Mappings:", err);
      }
    })();
  }, []);

  const handleRemoveExternalSchema = () => {
    setSchema(null);
  };

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
      {/* Only show FilePicker if no columns have been processed yet */}
      {!columnsData.length && (
        <FilePicker
          // Pass multi‐node array: [ { nodeId, nodeName, files: [...] }, ... ]
          files={elementFileList}
          onFilesSelected={handleProcessSelectedElements}
          isProcessing={processingStatus === "processing"}
          modalTitle="Select dataset elements to map"
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
            <ColumnSearch
              columnsData={columnsData}
              handleColumnClick={(col) => {
                const alreadyExists = temporaryGroups.some(
                  (g) =>
                    g.column === col.column &&
                    g.fileName === col.fileName &&
                    g.nodeId === col.nodeId
                );
                if (!alreadyExists)
                  setTemporaryGroups([...temporaryGroups, col]);
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
