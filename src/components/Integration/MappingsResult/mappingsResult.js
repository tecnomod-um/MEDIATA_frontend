// Component displaying filtered and searchable mapping results
import React, { useMemo, useState } from "react";
import MappingsResultStyles from "./mappingsResult.module.css";
import MappingHierarchy from "../MappingHierarchy/mappingHierarchy";
import MappingsExporter from "./mappingsExporter";

function MappingsResult({ mappings, columnsData, deletedItems, processingStatus, onUndoDelete, onDeleteMapping, onOpenFileMapper, formatValue, setMappings }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMappings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return mappings;

    return mappings
      .map((mappingObj) => {
        const nextObj = {};

        for (const [mappingKey, mapping] of Object.entries(mappingObj)) {
          const keyHit = String(mappingKey).toLowerCase().includes(term);
          const fileHit = String(mapping?.fileName ?? "").toLowerCase().includes(term);

          // Search inside groups/values/mapping lines too
          const groupsHit = (mapping?.groups ?? []).some((g) =>
            (g.values ?? []).some((v) => {
              const valueNameHit = String(v?.name ?? "").toLowerCase().includes(term);
              const mappingLineHit = (v?.mapping ?? []).some((m) => {
                const colHit = String(m?.groupColumn ?? "").toLowerCase().includes(term);
                const valHit = String(m?.value ?? "").toLowerCase().includes(term);
                const fileNameHit = String(m?.fileName ?? "").toLowerCase().includes(term);
                return colHit || valHit || fileNameHit;
              });
              return valueNameHit || mappingLineHit;
            })
          );

          if (keyHit || fileHit || groupsHit) nextObj[mappingKey] = mapping;
        }

        return nextObj;
      })
      .filter((obj) => Object.keys(obj).length > 0);
  }, [mappings, searchTerm]);
  return (
    <div className={MappingsResultStyles.resultingSection}>
      <div className={MappingsResultStyles.scrollableContainer}>
        <div className={MappingsResultStyles.searchRow}>
          <input
            className={MappingsResultStyles.searchInput}
            type="search"
            placeholder="Search mapped columns"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {deletedItems.length > 0 && (
          <div
            onClick={onUndoDelete}
            className={MappingsResultStyles.undoContainer}
          >
            Undo Changes
          </div>
        )}
        {filteredMappings.map((mappingObj, mappingIndex) =>
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
        <MappingsExporter mappings={mappings} />
        <button
          className={MappingsResultStyles.processMappingsButton}
          onClick={onOpenFileMapper}
          disabled={processingStatus === "processing"}
          type="button"
          aria-label="Process mappings"
        >
          {processingStatus === "processing" ? (
            <div
              className={MappingsResultStyles.loader}
              role="status"
              aria-live="polite"
            >
            </div>
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
