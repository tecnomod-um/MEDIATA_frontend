import React, {useMemo} from "react";
import {MdChevronRight} from "react-icons/md";
import FilterIndicator from "../FilterModal/filterIndicator";
import {sourceFilter} from "../FilterModal/appliedFilters";
import styles from "./toolTray.module.css";

// Keep site grouping and file indices together so collapsing a group never
// changes which dataset a checkbox controls.
export default function DatasetSelector({sources, activeIndices, onToggle, appliedFilters}) {
  const groups = useMemo(() => {
    const byNode = new Map();
    sources.forEach((source, index) => {
      const id = String(source.nodeId);
      if (!byNode.has(id)) byNode.set(id, {id, name: source.nodeName || `Node ${source.nodeId}`, files: []});
      byNode.get(id).files.push({source, index});
    });
    return [...byNode.values()];
  }, [sources]);

  return <section className={styles.multiFileSelector} aria-label="Datasets by site" tabIndex={0}>
    {groups.map(group => {
      const selected = group.files.filter(file => activeIndices[file.index]).length;
      return <details className={styles.nodeGroup} key={group.id} open>
        <summary className={styles.nodeGroupTitle}>
          <MdChevronRight className={styles.nodeChevron} aria-hidden="true" />
          <span className={styles.nodeName} title={group.name}>{group.name}</span>
          <span className={styles.nodeCount} title={`${selected} of ${group.files.length} datasets included`}>{selected}/{group.files.length}</span>
        </summary>
        <div className={styles.filesRow}>
          {group.files.map(({source, index}) => <label key={source.fileName}
            className={`${styles.fileToggle} ${activeIndices[index] ? styles.fileToggleActive : ""}`}
            title={`${group.name} / ${source.fileName}`}>
            <input type="checkbox" aria-label={source.fileName}
              aria-description={sourceFilter(appliedFilters, source) ? `Filtered records: ${sourceFilter(appliedFilters, source)}` : undefined}
              checked={Boolean(activeIndices[index])} onChange={() => onToggle(index)} />
            <span className={styles.fileNameEllipsis}>{source.fileName}</span>
            <FilterIndicator description={sourceFilter(appliedFilters, source)} />
          </label>)}
        </div>
      </details>;
    })}
  </section>;
}
