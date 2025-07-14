import React from "react";
import MappingsResultStyles from "./mappingsResult.module.css";
import MappingHierarchy from "../MappingHierarchy/mappingHierarchy";
import MappingsExporter from "./mappingsExporter";

function MappingsResult({ mappings, columnsData, deletedItems, processingStatus, onUndoDelete, onDeleteMapping, onOpenFileMapper, formatValue, setMappings }) {
  return (
    <div className={MappingsResultStyles.resultingSection}>
      <div className={MappingsResultStyles.scrollableContainer}>
        {deletedItems.length > 0 && (
          <div
            onClick={onUndoDelete}
            className={MappingsResultStyles.undoContainer}
          >
            Undo Changes
          </div>
        )}
        {mappings.map((mappingObj, mappingIndex) =>
          Object.keys(mappingObj).map((mappingKey, index) => (
            <MappingHierarchy
              key={index}
              mappingIndex={mappingIndex}
              mappingKey={mappingKey}
              mapping={mappingObj[mappingKey]}
              columnsData={columnsData}
              onDeleteMapping={onDeleteMapping}
              formatValue={formatValue}
              onUpdateMapping={(mappingIndex, oldKey, updatedMapping, newKey) => {
                setMappings((prev) =>
                  prev.map((m, i) => {
                    if (i !== mappingIndex) return m;
                    const newMappingObj = { ...m };
                    if (newKey && newKey !== oldKey) {
                      delete newMappingObj[oldKey];
                      newMappingObj[newKey] = updatedMapping;
                    } else
                      newMappingObj[oldKey] = updatedMapping;
                    return newMappingObj;
                  })
                );
              }}
            />
          ))
        )}
      </div>

      <div className={MappingsResultStyles.bottomActions}>
        <MappingsExporter
          mappings={mappings}
        />
        <button
          className={MappingsResultStyles.processMappingsButton}
          onClick={onOpenFileMapper}
          disabled={processingStatus === "processing"}
        >
          {processingStatus === "processing" ? (
            <div className={MappingsResultStyles.loader}></div>
          ) : processingStatus === "success" ? (
            "Processing Successful"
          ) : processingStatus === "error" ? (
            "Processing Failed"
          ) : (
            "Process datasets"
          )}
        </button>
      </div>
    </div>
  );
}

export default MappingsResult;
