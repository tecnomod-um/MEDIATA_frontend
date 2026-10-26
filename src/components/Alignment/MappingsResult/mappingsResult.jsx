import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import MappingsResultStyles from "./mappingsResult.module.css";
import ColumnSearchListStyles from "../ColumnSearchList/columnSearchList.module.css";
import MappingHierarchy from "../MappingHierarchy/mappingHierarchy";
import MappingsExporter from "./mappingsExporter";
import DeleteConfirmation from "../../Common/FileExplorer/deleteConfirmation";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import RestoreOutlinedIcon from "@mui/icons-material/RestoreOutlined";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

const MappingHierarchyEntry = React.memo(function MappingHierarchyEntry({
  mappingIndex,
  mappingKey,
  mapping,
  columnsData,
  onDeleteMapping,
  formatValue,
  autoOpen,
  onSelectMapping,
  onUpdateMapping,
}) {
  const handleSelect = useCallback(() => {
    onSelectMapping?.(mappingIndex, mappingKey);
  }, [mappingIndex, mappingKey, onSelectMapping]);

  return (
    <MappingHierarchy
      mappingIndex={mappingIndex}
      mappingKey={mappingKey}
      mapping={mapping}
      columnsData={columnsData}
      onDeleteMapping={onDeleteMapping}
      formatValue={formatValue}
      autoOpen={autoOpen}
      onSelect={handleSelect}
      onUpdateMapping={onUpdateMapping}
    />
  );
});

function MappingsResult({ mappings, columnsData, deletedItems, missingDefaultCount = 0, processingStatus, onUndoDelete, onDeleteMapping, onClearMappings, onRestoreDefaults, onOpenFileMapper, formatValue, setMappings, onSelectMapping, schema, onUploadMappings }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [restoreAnchor, setRestoreAnchor] = useState(null);
  const [autoOpenId, setAutoOpenId] = useState(null);
  const prevKeysRef = useRef(new Set());
  const didInitRef = useRef(false);

  const makeId = (mappingKey, mapping) =>
    `${mapping?.nodeId ?? ""}::${mapping?.fileName ?? ""}::${mappingKey}`;

  useEffect(() => {
    const nextKeys = new Set();
    const newOnes = [];

    mappings.forEach((mappingObj) => {
      Object.entries(mappingObj).forEach(([mappingKey, mapping]) => {
        const id = makeId(mappingKey, mapping);
        nextKeys.add(id);
        if (didInitRef.current && !prevKeysRef.current.has(id)) newOnes.push(id);
      });
    });

    prevKeysRef.current = nextKeys;

    if (!didInitRef.current) {
      didInitRef.current = true;
      setAutoOpenId(null);
      return;
    }

    if (newOnes.length) setAutoOpenId(newOnes[newOnes.length - 1]);
  }, [mappings]);

  const filteredMappings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const withOriginalIndex = mappings.map((mappingObj, originalIndex) => ({
      originalIndex,
      mappingObj,
    }));

    if (!term) return withOriginalIndex;

    return withOriginalIndex
      .map(({ originalIndex, mappingObj }) => {
        const nextObj = {};

        for (const [mappingKey, mapping] of Object.entries(mappingObj)) {
          const keyHit = String(mappingKey).toLowerCase().includes(term);
          const fileHit = String(mapping?.fileName ?? "").toLowerCase().includes(term);

          const groupsHit = (mapping?.groups ?? []).some((g) =>
            (g.values ?? []).some((v) => {
              const valueNameHit = String(v?.name ?? "").toLowerCase().includes(term);

              const mappingLineHit = (v?.mapping ?? []).some((m) => {
                const colHit = String(m?.groupColumn ?? "").toLowerCase().includes(term);
                const valHit =
                  typeof m?.value === "object" && m?.value !== null
                    ? JSON.stringify(m.value).toLowerCase().includes(term)
                    : String(m?.value ?? "").toLowerCase().includes(term);
                const fileNameHit = String(m?.fileName ?? "").toLowerCase().includes(term);
                return colHit || valHit || fileNameHit;
              });

              return valueNameHit || mappingLineHit;
            })
          );

          if (keyHit || fileHit || groupsHit) nextObj[mappingKey] = mapping;
        }

        return { originalIndex, mappingObj: nextObj };
      })
      .filter(({ mappingObj }) => Object.keys(mappingObj).length > 0);
  }, [mappings, searchTerm]);

  const handleUpdateMapping = useCallback((mappingIndex, oldKey, updatedMapping, newKey) => {
    setMappings((previous) =>
      previous.map((mappingObject, index) => {
        if (index !== mappingIndex) return mappingObject;

        const nextMappingObject = { ...mappingObject };
        if (newKey && newKey !== oldKey) {
          delete nextMappingObject[oldKey];
          nextMappingObject[newKey] = updatedMapping;
        } else {
          nextMappingObject[oldKey] = updatedMapping;
        }

        return nextMappingObject;
      })
    );
  }, [setMappings]);

  const hasMappings = mappings.some((mapping) => Object.keys(mapping).length > 0);
  const undoItem = deletedItems[deletedItems.length - 1];
  const restoreLabel = undoItem?.type === "all" ? `Restore ${undoItem.count} mappings` : `Restore ${undoItem?.key}`;
  const confirmClearMappings = () => {
    onClearMappings?.();
    setSearchTerm("");
    setIsClearConfirmOpen(false);
  };

  return (
    <div className={MappingsResultStyles.resultingSection}>
      <div className={MappingsResultStyles.searchRow}>
        <input
          className={ColumnSearchListStyles.input}
          type="search"
          placeholder="Search target schema"
          aria-label="Search target schema"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className={MappingsResultStyles.searchActions}>
          <button
            className={MappingsResultStyles.restoreMenuButton}
            type="button"
            aria-label="Restore mappings"
            aria-haspopup="menu"
            aria-expanded={Boolean(restoreAnchor)}
            title="Restore mappings"
            disabled={!undoItem && !missingDefaultCount}
            onClick={(event) => setRestoreAnchor(event.currentTarget)}
          >
            <RestoreOutlinedIcon fontSize="small" />
          </button>
          <button
            className={MappingsResultStyles.clearMappingsButton}
            type="button"
            onClick={() => setIsClearConfirmOpen(true)}
            disabled={!hasMappings}
            aria-label="Remove all target-schema mappings"
            title="Remove all target-schema mappings"
          >
            <DeleteSweepOutlinedIcon fontSize="small" />
          </button>
        </div>
        <Menu
          anchorEl={restoreAnchor}
          open={Boolean(restoreAnchor)}
          onClose={() => setRestoreAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          PaperProps={{ className: MappingsResultStyles.restoreMenu }}
        >
          {undoItem && <MenuItem onClick={() => {
            setRestoreAnchor(null);
            onUndoDelete?.();
          }}>{restoreLabel}</MenuItem>}
          {missingDefaultCount > 0 && <MenuItem onClick={() => {
            setRestoreAnchor(null);
            onRestoreDefaults?.();
          }}>
              Restore missing defaults
              <span className={MappingsResultStyles.restoreCount}>{missingDefaultCount}</span>
            </MenuItem>}
        </Menu>
      </div>

      <div className={MappingsResultStyles.scrollableContainer}>

        {filteredMappings.map(({ originalIndex, mappingObj }) =>
          Object.entries(mappingObj).map(([mappingKey, mapping]) => {
            const id = makeId(mappingKey, mapping);

            return (
              <MappingHierarchyEntry
                key={id}
                mappingIndex={originalIndex}
                mappingKey={mappingKey}
                mapping={mapping}
                columnsData={columnsData}
                onDeleteMapping={onDeleteMapping}
                formatValue={formatValue}
                autoOpen={autoOpenId === id}
                onSelectMapping={onSelectMapping}
                onUpdateMapping={handleUpdateMapping}
              />
            );
          })
        )}
      </div>

      <div className={MappingsResultStyles.bottomActions}>
        <MappingsExporter
          mappings={mappings}
          schema={schema}
          onUploadMappings={onUploadMappings}
        />

        <button
          className={MappingsResultStyles.processMappingsButton}
          onClick={onOpenFileMapper}
          disabled={processingStatus === "processing"}
          type="button"
          aria-label="Process mappings"
        >
          {processingStatus === "processing" ? (
            <div className={MappingsResultStyles.loader} role="status" aria-live="polite"></div>
          ) : processingStatus === "success" ? (
            "Processing Successful"
          ) : processingStatus === "error" ? (
            "Processing Failed"
          ) : (
            "Process datasets"
          )}
        </button>
      </div>

      <DeleteConfirmation
        show={isClearConfirmOpen}
        title="Remove all mappings"
        message="All target-schema mappings will be removed and can be restored with Undo. Unsaved mapping edits will be discarded."
        confirmLabel="Remove all"
        onCancel={() => setIsClearConfirmOpen(false)}
        onConfirm={confirmClearMappings}
        portal
      />
    </div>
  );
}

export default React.memo(MappingsResult);
