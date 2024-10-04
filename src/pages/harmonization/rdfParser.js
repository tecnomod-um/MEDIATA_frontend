import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { CSSTransition } from "react-transition-group";
import RdfParserStyles from "./rdfParser.module.css";
import DataUploadButton from "../../components/DataUploadButton/dataUploadButton";
import DragAndDropOverlay from "../../components/DragAndDropOverlay/dragAndDropOverlay";
import ColumnMapping from "../../components/ColumnMapping/columnMapping";
import ColumnSearch from "../../components/ColumnSearch/columnSearch";

function RdfParser() {
  const location = useLocation();
  const [files, setFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [columnsData, setColumnsData] = useState([]);
  const [mappings, setMappings] = useState({});
  const [temporaryGroups, setTemporaryGroups] = useState([]);

  useEffect(() => {
    if (location.state && location.state.csvData) {
      const data = parseCSV(location.state.csvData);
      setColumnsData(data);
      initializeMappings(data);
    }
  }, [location.state]);

  const parseCSV = (text) => {
    const lines = text.trim().split("\n");
    return lines.map((line) => {
      const [column, ...values] = line.split(",");
      return { column, values };
    });
  };

  const initializeMappings = (data) => {
    const initialMappings = data.reduce((acc, column) => {
      acc[column.column] = {
        columns: [column.column],
        groups: [
          {
            column: column.column,
            values: column.values.map((value) => ({
              name: value,
              mapping: [{ groupColumn: column.column, value }],
            })),
          },
        ],
      };
      return acc;
    }, {});
    setMappings(initialMappings);
  };

  const handleFilesSelected = async (newFiles) => {
    const filesArray = Array.from(newFiles);
    setFiles((prevFiles) => [...prevFiles, ...filesArray]);

    let allColumnsData = [];
    for (const file of filesArray) {
      setUploadStatus(`Uploading ${file.name}...`);
      setErrorMessage("");
      try {
        const text = await file.text();
        const data = parseCSV(text);
        setUploadStatus("Upload successful!");
        allColumnsData = mergeColumnsData(allColumnsData, data);
      } catch (error) {
        const errorMsg = error.message || "Upload failed";
        setUploadStatus("Upload failed.");
        setErrorMessage(errorMsg);
      }
    }
    setColumnsData(allColumnsData);
    initializeMappings(allColumnsData);
  };

  const mergeColumnsData = (existingData, newData) => {
    const mergedData = [...existingData];
    newData.forEach((row) => {
      const existingColumn = mergedData.find(
        (item) => item.column === row.column
      );
      if (existingColumn) {
        existingColumn.values = Array.from(
          new Set([...existingColumn.values, ...row.values])
        );
      } else {
        mergedData.push(row);
      }
    });
    return mergedData;
  };

  const handleMappingChange = (newGroups) => {
    setTemporaryGroups(newGroups);
  };

  const handleSaveMappings = (
    groups,
    unionName,
    customValues,
    removeFromHierarchy
  ) => {
    const updatedMappings = {
      ...mappings,
      [unionName]: {
        columns: groups.map((group) => group.column),
        groups: groups.map((group) => ({
          column: group.column,
          values:
            customValues.length > 0
              ? customValues
              : group.values.map((value) => ({
                  name: value,
                  mapping: [{ groupColumn: group.column, value }],
                })),
        })),
      },
    };

    if (removeFromHierarchy)
      groups.forEach((group) => {
        delete updatedMappings[group.column];
      });

    setMappings(updatedMappings);
    setTemporaryGroups([]);

    console.log(updatedMappings);
  };

  const handleDragStart = (e, column) => {
    e.dataTransfer.setData("column", JSON.stringify(column));

    const dragImage = document.createElement("div");
    dragImage.style.position = "absolute";
    dragImage.style.top = "-9999px";
    dragImage.style.left = "-9999px";
    dragImage.style.padding = "8px 12px";
    dragImage.style.backgroundColor = "#ddd";
    dragImage.style.borderRadius = "4px";
    dragImage.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
    dragImage.textContent = column.column;
    dragImage.style.opacity = "1";
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);

    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleColumnClick = (column) => {
    if (!temporaryGroups.some((group) => group.column === column.column)) {
      const newGroups = [...temporaryGroups, column];
      setTemporaryGroups(newGroups);
    }
  };

  const renderHierarchy = (mapping, mappingKey) => {
    return (
      <div className={RdfParserStyles.entryContainer}>
        <h4>{mappingKey}</h4>
        <div className={RdfParserStyles.groupContainer}>
          <div className={RdfParserStyles.valueContainer}>
            {mapping.groups[0].values.map((valueObj, valIndex) => (
              <div key={valIndex} className={RdfParserStyles.valueBox}>
                <div className={RdfParserStyles.valueName}>{valueObj.name}</div>
                <div className={RdfParserStyles.mappings}>
                  {valueObj.mapping.map(
                    (map, mapIndex) =>
                      (map.groupColumn !== mappingKey ||
                        map.value !== valueObj.name) && (
                        <div
                          key={mapIndex}
                          className={RdfParserStyles.mappingItem}
                        >
                          <span>{map.groupColumn}</span>
                          <div className={RdfParserStyles.mappingArrow}></div>
                          <span>{map.value}</span>
                        </div>
                      )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={RdfParserStyles.pageContainer}>
      {!columnsData.length && !location.state?.csvData && (
        <div className={RdfParserStyles.uploadContainer}>
          <DragAndDropOverlay onDrop={handleFilesSelected} />
          <DataUploadButton
            onFileSelected={handleFilesSelected}
            uploadStatus={uploadStatus}
            errorMessage={errorMessage}
          />
        </div>
      )}
      <div className={RdfParserStyles.mappingContainer}>
        <CSSTransition
          in={!!columnsData.length}
          classNames={{
            enter: RdfParserStyles.columnsSectionEnter,
            enterActive: RdfParserStyles.columnsSectionEnterActive,
            exit: RdfParserStyles.columnsSectionExit,
            exitActive: RdfParserStyles.columnsSectionExitActive,
          }}
          timeout={500}
          unmountOnExit
        >
          <div className={RdfParserStyles.columnsSection}>
            <ColumnSearch
              columnsData={columnsData}
              handleColumnClick={handleColumnClick}
              handleDragStart={handleDragStart}
            />
          </div>
        </CSSTransition>
        <CSSTransition
          in={!!columnsData.length}
          classNames={{
            enter: RdfParserStyles.columnMappingEnter,
            enterActive: RdfParserStyles.columnMappingEnterActive,
            exit: RdfParserStyles.columnMappingExit,
            exitActive: RdfParserStyles.columnMappingExitActive,
          }}
          timeout={500}
          unmountOnExit
        >
          <ColumnMapping
            columnsData={columnsData}
            onMappingChange={handleMappingChange}
            groups={temporaryGroups}
            onSave={handleSaveMappings}
          />
        </CSSTransition>
        <CSSTransition
          in={!!columnsData.length}
          classNames={{
            enter: RdfParserStyles.resultingSectionEnter,
            enterActive: RdfParserStyles.resultingSectionEnterActive,
            exit: RdfParserStyles.resultingSectionExit,
            exitActive: RdfParserStyles.resultingSectionExitActive,
          }}
          timeout={500}
          unmountOnExit
        >
          <div className={RdfParserStyles.resultingSection}>
            <div className={RdfParserStyles.scrollableContainer}>
              {Object.keys(mappings).map((mappingKey, index) => (
                <div key={index}>
                  {renderHierarchy(mappings[mappingKey], mappingKey)}
                </div>
              ))}
            </div>
          </div>
        </CSSTransition>
      </div>
    </div>
  );
}

export default RdfParser;
