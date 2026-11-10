import React, { useCallback, useId, useMemo, useState } from "react";
import { MdChevronRight, MdChevronLeft, MdSync } from "react-icons/md";
import Switch from "react-switch";
import { toast } from "react-toastify";
import ToolTrayStyles from "./toolTray.module.css";
import DataExporter from "../DataExporter/dataExporter";
import ElementExporter from "../ElementExporter/elementExporter";
import CompareFilesModal from "../CompareFilesModal/compareFilesModal";
import { requestFeatureTypeChanges } from "../featureTypeChanges";
import { useNode } from "../../../context/nodeContext";
import FilterIndicator from "../FilterModal/filterIndicator";
import { sourceFilter } from "../FilterModal/appliedFilters";
import DatasetSelector from "./datasetSelector";

const getEntrySet = (dataSet) => {
  if (!dataSet) return [];
  return [
    ...(dataSet.dateFeatures || []).map((item) => ({
      featureName: item.featureName,
      type: "date",
      fileName: item.fileName,
      nodeId: item.nodeId,
      originalName: item.originalName,
      nodeName: item.nodeName,
    })),
    ...(dataSet.categoricalFeatures || []).map((item) => ({
      featureName: item.featureName,
      type: "categorical",
      fileName: item.fileName,
      nodeId: item.nodeId,
      originalName: item.originalName,
      nodeName: item.nodeName,
    })),
    ...(dataSet.continuousFeatures || []).map((item) => ({
      featureName: item.featureName,
      type: "continuous",
      fileName: item.fileName,
      nodeId: item.nodeId,
      originalName: item.originalName,
      nodeName: item.nodeName,
    })),
  ];
};

const FeatureToggle = React.memo(function FeatureToggle({ entry, checked, onToggle, filterDescription }) {
  const handleChange = useCallback(() => onToggle(entry), [entry, onToggle]);

  return (
    <li className={ToolTrayStyles.featureItem}>
      <label title={entry.featureName}>
        <Switch
          aria-label={entry.featureName}
          checked={checked}
          onChange={handleChange}
          height={16}
          width={32}
          handleDiameter={12}
          offColor="#888"
          onColor="#9ABDDC"
          className={ToolTrayStyles.featureSwitch}
        />
        <span className={ToolTrayStyles.featureToggleText}>
          <span className={ToolTrayStyles.featureToggleName}>{entry.originalName || entry.featureName}</span>
          {entry.fileName && <small className={ToolTrayStyles.featureSource} title={`${entry.nodeName ? `${entry.nodeName} / ` : ""}${entry.fileName}`}>{entry.nodeName ? `${entry.nodeName} / ` : ""}{entry.fileName}</small>}
        </span>
        <FilterIndicator description={filterDescription} />
      </label>
    </li>
  );
});

// Sidebar holding all the discovery view controls
function ToolTray({ refreshControllerRef, data, filteredData, setFilteredData, showOutliers, setShowOutliers, isToolTrayOpen, toggleToolTray, selectedEntries = [], selectedSourceFeatures = selectedEntries, filters, toggleFilters, dataResults = [], activeFileIndices = [], toggleFileActive, showIndividualView, toggleView, isCombining = false, onFeatureRecalculated, onTypeChanging, statisticsExport, relationshipExport, onExportRelationshipsChange, appliedFilters, featureFilters }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const controlsId = useId();
  const { selectedNodes } = useNode();
  const selectedEntry = selectedEntries.length === 1 ? selectedEntries[0] : null;
  const selectionNames = [...new Set(selectedEntries.map(entry => entry.originalName || entry.featureName))].join(", ");
  const selectionTitle = selectedEntries.map(entry => `${entry.originalName || entry.featureName}${entry.fileName ? ` (${entry.nodeName || ""} / ${entry.fileName})` : ""}`).join("\n");
  const selectedSourceName = selectedEntry?.nodeName || dataResults.find(source =>
    String(source.nodeId) === String(selectedEntry?.nodeId) && source.fileName === selectedEntry?.fileName
  )?.nodeName;
  const selectionType = selectedSourceFeatures.every(entry => entry.type === "categorical") ? "categorical"
    : selectedSourceFeatures.every(entry => entry.type !== "categorical") ? "continuous" : "mixed";
  const targetType = selectionType === "categorical" ? "continuous" : "categorical";
  const hasCombinedSelection = selectedEntries.some(entry => entry.pooled);
  const sourceDetails = hasCombinedSelection ? selectedEntries.flatMap(entry => entry.pooled
    ? (entry.combinedSummary?.contributions || []).map(part => ({...part.source, originalName: part.columnName}))
    : [entry]) : selectedSourceFeatures;
  const combinedSources = [...new Set(sourceDetails.map(entry =>
    `${entry.nodeName ? `${entry.nodeName} / ` : ""}${entry.fileName}`))];
  const combinedDetails = sourceDetails.map(entry => `${entry.originalName || entry.featureName}: ${entry.nodeName || ""} / ${entry.fileName}`).join("\n");
  const combinedSites = [...new Set(sourceDetails.map(entry => entry.nodeName).filter(Boolean))];
  const hasDatasetFilters = (Array.isArray(filters) ? filters.length > 0 : Object.values(filters || {}).some(value => value?.length));

  const toggleFeatureType = async () => {
    if (!selectedSourceFeatures.length || isLoading || isCombining || hasDatasetFilters) return;
    setIsLoading(true);
    onTypeChanging?.(true);
    try {
      const changes = await requestFeatureTypeChanges({entries: selectedSourceFeatures, targetType, statistics: data, sources: dataResults, nodes: selectedNodes, signal: refreshControllerRef?.current?.signal});
      if (!onFeatureRecalculated) throw new Error("Feature type updates are unavailable in this view.");
      onFeatureRecalculated(changes);
    } catch (error) {
      toast.error("Feature recalculation failed: " + error.message);
    } finally {
      setIsLoading(false);
      onTypeChanging?.(false);
    }
  };
  const entrySet = useMemo(() => getEntrySet(data), [data]);

  // Filter entries based on the search term
  const displayedFeatures = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase();
    return entrySet.filter((entry) =>
      entry.featureName.toLowerCase().includes(normalizedSearch)
    );
  }, [entrySet, searchTerm]);

  const isFeatureChecked = useCallback((entry) =>
    filteredData[`${entry.type}Features`]?.some(
      (item) => item.featureName === entry.featureName
    ) ?? false,
  [filteredData]);

  const allDisplayedChecked = useMemo(() =>
    displayedFeatures.every(isFeatureChecked),
  [displayedFeatures, isFeatureChecked]);

  const toggleFeature = useCallback((entry) => {
    setFilteredData((previous) => {
      const featureKey = `${entry.type}Features`;
      const nextFiltered = { ...previous };
      const features = [...(nextFiltered[featureKey] || [])];
      const index = features.findIndex((feature) => feature.featureName === entry.featureName);

      if (index >= 0) {
        features.splice(index, 1);
      } else {
        const feature = data[featureKey]?.find((item) => item.featureName === entry.featureName);
        if (feature) features.push(feature);
      }
      nextFiltered[featureKey] = features;
      return nextFiltered;
    });
  }, [data, setFilteredData]);

  const toggleAllDisplayedFeatures = useCallback(() => {
    setFilteredData((prev) => {
      const newFiltered = { ...prev };
      displayedFeatures.forEach((entry) => {
        const featKey = `${entry.type}Features`;
        const arr = [...(newFiltered[featKey] || [])];
        const i = arr.findIndex((f) => f.featureName === entry.featureName);

        if (allDisplayedChecked) {
          // Turn them all off
          if (i >= 0) {
            arr.splice(i, 1);
          }
        } else {
          // Turn them all on
          if (i < 0) {
            const item = data[featKey]?.find((f) => f.featureName === entry.featureName);
            if (item) arr.push(item);
          }
        }
        newFiltered[featKey] = arr;
      });
      return newFiltered;
    });
  }, [allDisplayedChecked, data, displayedFeatures, setFilteredData]);

  return (
    <aside aria-label="Discovery controls" className={`${ToolTrayStyles.container} ${isToolTrayOpen ? ToolTrayStyles.open : ToolTrayStyles.closed}`}>
      <button type="button"
        className={ToolTrayStyles.toggleButton}
        onClick={toggleToolTray}
        aria-expanded={isToolTrayOpen}
        aria-controls={controlsId}
        aria-label={isToolTrayOpen ? 'Close tool tray' : 'Open tool tray'}
      >
        {isToolTrayOpen ? <MdChevronLeft /> : <MdChevronRight />}
      </button>

      <div id={controlsId} className={ToolTrayStyles.scrollContent} role="region" aria-label="Sidebar content" tabIndex={0} inert={isToolTrayOpen ? undefined : ""} aria-hidden={!isToolTrayOpen}>

      <div className={ToolTrayStyles.topSection}>
        {selectedEntries.length > 0 ? (
          <>
            <h3 title={selectionTitle}>{selectionNames}<FilterIndicator description={selectedEntries.map(entry => featureFilters?.[entry.featureName] || sourceFilter(appliedFilters, entry)).filter(Boolean).join("; ")} /></h3>
            {hasCombinedSelection ? <small className={ToolTrayStyles.combinedSources} title={combinedDetails}>
              {combinedSites.length ? `${combinedSites.join(" ↔ ")} · ${combinedSources.length} datasets` : combinedSources.join(" ↔ ")}
            </small> : <>
            <small className={ToolTrayStyles.selectedSource} title={selectionTitle}>
              {selectedEntry?.fileName ? `${selectedSourceName ? `${selectedSourceName} / ` : ""}${selectedEntry.fileName}`
                : `${selectedSourceFeatures.length} features · ${combinedSources.length} dataset${combinedSources.length === 1 ? "" : "s"}`}
            </small>
            <button
              className={`${ToolTrayStyles.toggleFeatureTypeButton} ${isLoading ? ToolTrayStyles.loading : ""
                }`}
              onClick={toggleFeatureType}
              type="button"
              disabled={isLoading || isCombining || hasDatasetFilters || !selectedSourceFeatures.length}
              title={hasDatasetFilters ? "Clear dataset filters before changing variable types" : `Set ${selectedSourceFeatures.length} selected feature${selectedSourceFeatures.length === 1 ? "" : "s"} to ${targetType}`}
              aria-label={selectedEntries.length === 1 ? "Toggle the selected feature's type between categorical and continuous" : `Set selected features to ${targetType}`}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <div className={ToolTrayStyles.spinner} role="progressbar" aria-label="Recalculating feature statistics"></div>
              ) : (
                <>
                  <span className={ToolTrayStyles.entryType} aria-label={selectionType === "categorical" ? "Categorical" : selectionType === "mixed" ? "Mixed types" : "Continuous"}>
                    {selectionType === "categorical" ? "Categorical" : selectionType === "mixed" ? "Mixed types" : "Continuous"}
                  </span>
                  <MdSync className={ToolTrayStyles.iconSpin} aria-hidden="true" />
                </>
              )}
            </button>
            </>}
          </>
        ) : (
          <h3 className={ToolTrayStyles.emptySelection}>No entry selected</h3>
        )}
      </div>

      {/* Multi-file selector */}
      {dataResults.length > 1 && (
        <DatasetSelector sources={dataResults} activeIndices={activeFileIndices} onToggle={toggleFileActive} appliedFilters={appliedFilters} />
      )}

      {/* Feature toggles */}
      <div className={ToolTrayStyles.featureControls}>
      <section className={ToolTrayStyles.featuresList} aria-label="Features" tabIndex={0}>
        <ul>
          {displayedFeatures.map((entry) => (
            <FeatureToggle
              key={`${entry.type}:${entry.featureName}`}
              entry={entry}
              checked={isFeatureChecked(entry)}
              onToggle={toggleFeature}
              filterDescription={sourceFilter(appliedFilters, entry)}
            />
          ))}
        </ul>
      </section>

      {/* Search and Toggle All at the bottom */}
      <div className={ToolTrayStyles.searchContainer}>
        <input
          type="text"
          className={ToolTrayStyles.searchInput}
          placeholder="Search features..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className={ToolTrayStyles.toggleAllButton} onClick={toggleAllDisplayedFeatures}>
          {allDisplayedChecked ? "Hide All" : "Show All"}
        </button>
      </div>
      </div>

      <div className={ToolTrayStyles.actionStack} role="group" aria-label="Discovery tools">
      {/* Existing switch between statistics and association metrics */}
      <div className={ToolTrayStyles.buttonContainer}>
        <button onClick={toggleView}>{showIndividualView ? "Display aggregate metrics" : "Display individual metrics"}</button>
      </div>

      {/* Outliers switch */}
      <div className={ToolTrayStyles.buttonContainer}>
        <label htmlFor="toggleOutliers" className={ToolTrayStyles.outliersLabel} title={showOutliers ? "Hide outliers" : "Show outliers"}>
          <Switch
            checked={showOutliers}
            onChange={setShowOutliers}
            id="toggleOutliers"
            aria-label="Toggle outliers"
            height={16}
            width={32}
            handleDiameter={12}
            offColor="#888"
            onColor="#9ABDDC"
            className={ToolTrayStyles.outliersSwitch}
          />
          Outliers: {showOutliers ? "shown" : "hidden"}
        </label>
      </div>

      {/* Filters */}
      <div className={ToolTrayStyles.buttonContainer}>
        <button onClick={toggleFilters} disabled={isCombining}>
          {(Array.isArray(filters) ? filters.length > 0 : Object.values(filters || {}).some(value => value?.length)) ? "Filters added" : "Set filters"}
        </button>
      </div>

      {dataResults.length > 1 && (
        <div className={ToolTrayStyles.buttonContainer}>
          <button onClick={() => setIsCompareModalOpen(true)}>
            Integrity metrics
          </button>
        </div>
      )}
      {isCompareModalOpen && (
        <CompareFilesModal
          isOpen={isCompareModalOpen}
          closeModal={() => setIsCompareModalOpen(false)}
          filesData={dataResults}
          showOutliers={showOutliers}
        />
      )}

      {/* Data exporter */}
      <div className={ToolTrayStyles.buttonContainer}>
        <DataExporter statisticsExport={statisticsExport} relationshipExport={relationshipExport} selectedEntries={selectedEntries} onRelationshipsChange={onExportRelationshipsChange} busy={isCombining} />
      </div>

      {/* Element exporter */}
      <div className={ToolTrayStyles.buttonContainer}>
        <ElementExporter
          dataResults={dataResults}
          activeFileIndices={activeFileIndices}
          combinedData={data}
          filteredData={filteredData}
          busy={isCombining}
        />
      </div>
      </div>
      </div>
    </aside>
  );
}

export default React.memo(ToolTray);
