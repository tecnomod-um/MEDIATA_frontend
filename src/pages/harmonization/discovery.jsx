import React, { useState, useCallback, useEffect, useMemo, useRef, useReducer } from "react";
import { useLocation } from "react-router-dom";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import DiscoveryStyles from "./discovery.module.css";
import FileExplorer from "../../components/Common/FileExplorer/fileExplorer";
import StatisticsDisplay from "../../components/Discovery/StatisticsDisplay/statisticsDisplay";
import ToolTray from "../../components/Discovery/ToolTray/toolTray";
import AggregateDisplay from "../../components/Discovery/AggregatesDisplay/aggregateDisplay";
import FilterModal from "../../components/Discovery/FilterModal/filterModal";
import { ToastContainer, toast } from "react-toastify";
import { getNodeDatasets, processSelectedDatasets, getProcessSelectedDatasetsStatus, getProcessSelectedDatasetsResult, cancelProcessSelectedDatasetsJob } from "../../util/petitionHandler";
import { updateNodeAxiosBaseURL } from "../../util/nodeAxiosSetup";

import TableMergeControl from "../../components/Discovery/StatisticsDisplay/tableMergeControl";
import ColumnMappingsDialog from "../../components/Discovery/StatisticsDisplay/columnMappingsDialog";
import { combineMappedTableData } from "../../components/Discovery/CombinedStatistics/statisticsTableData";
import { createColumnMappings, activeColumnMappings, validateColumnMappings, reconcileMappingTypes } from "../../components/Discovery/CombinedStatistics/columnMappings";
import { filterDiscoveryDatasets } from "../../components/Discovery/CombinedStatistics/filterDiscoveryDatasets";
import { fileFilterConditions } from "../../components/Discovery/FilterModal/filterFeatures";
import { buildAppliedFilters, tableFilterDescriptions } from "../../components/Discovery/FilterModal/appliedFilters";
import useRelationshipStatistics from "../../components/Discovery/CombinedStatistics/useRelationshipStatistics";
import LinearProgress from "@mui/material/LinearProgress";
import { useNode } from "../../context/nodeContext";
import { collectDiscoveryStatistics, updateSourceFeature } from "../../components/Discovery/discoveryStatistics";
import { reconcileFeatureVisibility } from "../../components/Discovery/featureTypeChanges";
import { featureSelectionReducer, sourceFeatureSelection, selectableFeatures } from "../../components/Discovery/featureSelection";

// Discovery page for data profiling and statistics visualization
function Discovery() {
  const [dataResults, setDataResults] = useState([]);
  const [activeFileIndices, setActiveFileIndices] = useState([]);
  const [dataStatistics, setDataStatistics] = useState(null);
  const [filteredDataStatistics, setFilteredDataStatistics] = useState(null);
  const [showIndividualView, setShowIndividualView] = useState(true);
  const toggleView = useCallback(() => setShowIndividualView(previous => !previous), []);
  const [combineTables, setCombineTables] = useState(false);
  const [customMappings, setCustomMappings] = useState(null);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [exportRelationships, setExportRelationships] = useState(false);
  const [filterLogic, setFilterLogic] = useState({ operators: {}, operator: "AND", matchColumns: true });
  const [isCombining, setIsCombining] = useState(false);
  const baselineResultsRef = useRef([]);
  const previousStatisticsRef = useRef(null);
  const hiddenFeaturesRef = useRef(new Set());
  const [showOutliers, setShowOutliers] = useState(false);
  const [isToolTrayOpen, setIsToolTrayOpen] = useState(() => window.innerWidth > 768);
  const [selection, dispatchSelection] = useReducer(featureSelectionReducer, {entries:[], additive:false});
  const selectedEntries = selection.entries;
  const [isFiltersOpen, setIsFiltersopen] = useState(false);
  const [filters, setFilters] = useState([]);

  const [hasProcessedMappingState, setHasProcessedMappingState] = useState(false);
  const { selectedNodes } = useNode();
  // eslint-disable-next-line no-unused-vars
  const [datasets, setDatasets] = useState([]);
  const location = useLocation();
  const toggleToolTray = useCallback(() => setIsToolTrayOpen((open) => !open), []);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const mountedRef = useRef(true);
  const refreshControllerRef = useRef(null);
  const activeJobsRef = useRef(new Map());
  const canceledByNavigationRef = useRef(false);

  const pollDiscoveryJob = useCallback(async (jobId, node, onProgress) => {
    while (mountedRef.current) {
      try {
        updateNodeAxiosBaseURL(node.serviceUrl);
        const status = await getProcessSelectedDatasetsStatus(jobId, node.serviceUrl);
  
        if (typeof status?.percent === "number") onProgress(status.percent);
  
        const state = String(status?.state || "").toUpperCase();
  
        if (state === "DONE") {
          const results = await getProcessSelectedDatasetsResult(jobId, node.serviceUrl);
          activeJobsRef.current.delete(jobId);
          return results || [];
        }
  
        if (state === "CANCELED") {
          activeJobsRef.current.delete(jobId);
          const err = new Error(status?.message || "Discovery job was canceled");
          err.code = "DISCOVERY_CANCELED";
          throw err;
        }
  
        if (state === "ERROR") {
          activeJobsRef.current.delete(jobId);
          throw new Error(status.message || "Discovery job failed");
        }
  
        await sleep(500);
      } catch (error) {
        const statusCode = error?.response?.status;
  
        // If the UI changed and the job/status disappears, treat it as cancellation.
        if (!mountedRef.current || canceledByNavigationRef.current || statusCode === 404) {
          activeJobsRef.current.delete(jobId);
          const err = new Error("Discovery canceled because you left the page");
          err.code = "DISCOVERY_CANCELED";
          throw err;
        }
  
        throw error;
      }
    }
  
    const err = new Error("Discovery canceled because you left the page");
    err.code = "DISCOVERY_CANCELED";
    throw err;
  }, []);

  const cancelAllDiscoveryJobs = useCallback(async () => {
    canceledByNavigationRef.current = true;
  
    const entries = Array.from(activeJobsRef.current.entries());
  
    await Promise.allSettled(
      entries.map(async ([jobId, meta]) => {
        try {
          if (meta?.node?.serviceUrl) {
            updateNodeAxiosBaseURL(meta.node.serviceUrl);
          }
          await cancelProcessSelectedDatasetsJob(jobId, meta?.node?.serviceUrl);
        } catch (e) {
          // Ignore cancel failures
        }
      })
    );
  
    activeJobsRef.current.clear();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refreshControllerRef.current = new AbortController();
    canceledByNavigationRef.current = false;
  
    return () => {
      mountedRef.current = false;
      refreshControllerRef.current?.abort();
      cancelAllDiscoveryJobs();
    };
  }, [cancelAllDiscoveryJobs]);

  useEffect(() => {
    if (location.state?.elementFiles?.length && !hasProcessedMappingState) {
      const elementFiles = location.state.elementFiles;
      const nodeMapping = {};
      elementFiles.forEach(({ nodeId, fileName }) => {
        if (!nodeMapping[nodeId]) nodeMapping[nodeId] = [];
        nodeMapping[nodeId].push(fileName);
      });
      (async () => {
        try {
          let allResults = [];
          await Promise.all(
            selectedNodes.map(async (node) => {
              const filesForNode = nodeMapping[node.nodeId] || [];
              if (filesForNode.length === 0) return;
              updateNodeAxiosBaseURL(node.serviceUrl);
              const result = await processSelectedDatasets(filesForNode, node.serviceUrl);

              if (result.mode === "sync") {
                const arr = result.results || [];
                allResults = allResults.concat(
                  arr.map((r) => ({
                    ...r,
                    fileName: r.fileName || "Unknown File",
                    nodeId: node.nodeId,
                    nodeName: node.name,
                  }))
                );
                return;
              }

              if (result.mode === "async") {
                activeJobsRef.current.set(result.jobId, { node });
              
                const arr = await pollDiscoveryJob(result.jobId, node, () => {});
                allResults = allResults.concat(
                  arr.map((r) => ({
                    ...r,
                    fileName: r.fileName || "Unknown File",
                    nodeId: node.nodeId,
                    nodeName: node.name,
                  }))
                );
                return;
              }

              throw new Error("Unexpected response from processList");

            })
          );
          if (allResults.length === 0) {
            toast.error("No parsed files returned from backend.");
          }
          baselineResultsRef.current = allResults;
          setDataResults(allResults);
          setActiveFileIndices(allResults.map(() => true));
        } catch (error) {
          console.error("Error processing parsed element files:", error);
        
          if (error?.code === "DISCOVERY_CANCELED") {
            toast.info("File discovery was canceled.");
            return;
          }
        
          toast.error("Error processing parsed element files: " + error.message);
        }
      })();
      setHasProcessedMappingState(true);
    }
  }, [location.state, selectedNodes, dataResults.length, hasProcessedMappingState, pollDiscoveryJob]);

  const combineSelectedData = collectDiscoveryStatistics;

  useEffect(() => {
    if (dataResults.length) {
      const combined = combineSelectedData(dataResults, activeFileIndices);
      const previous = previousStatisticsRef.current;
      setDataStatistics(combined);
      setFilteredDataStatistics(visible => {
        const result = reconcileFeatureVisibility(previous, visible, combined, hiddenFeaturesRef.current);
        hiddenFeaturesRef.current = result.hidden;
        return result.statistics;
      });
      previousStatisticsRef.current = combined;
    }
  }, [dataResults, activeFileIndices, combineSelectedData]);

  const toggleFileActive = useCallback((index) => {
    setActiveFileIndices((prev) => {
      const newState = [...prev];
      if (newState[index] === true) {
        const howManyOn = newState.filter(Boolean).length;
        if (howManyOn === 1) {
          return prev;
        }
      }
      newState[index] = !newState[index];
      return newState;
    });
  }, []);

  useEffect(() => {
    if (selectedNodes && selectedNodes.length > 0) {
      const fetchDatasets = async () => {
        try {
          const results = await Promise.all(
            selectedNodes.map(async (node) => {
              updateNodeAxiosBaseURL(node.serviceUrl);
              const data = await getNodeDatasets(node.serviceUrl);
              return { nodeId: node.nodeId, nodeName: node.name, files: data || [] };
            })
          );
          setDatasets(results);
        } catch (error) {
          console.error("Error fetching datasets:", error);
        }
      };
      fetchDatasets();
    }
  }, [selectedNodes]);

  useEffect(() => {
    let desktop = window.innerWidth > 768;
    const handleResize = () => {
      const shouldOpen = window.innerWidth > 768;
      if (shouldOpen !== desktop) {
        desktop = shouldOpen;
        setIsToolTrayOpen(shouldOpen);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const preSelected = useMemo(() => {
    const selected = {};
    if (location.state?.elementFiles?.length) {
      location.state.elementFiles.forEach(({ nodeId, fileName }) => {
        if (!selected[nodeId]) selected[nodeId] = [];
        selected[nodeId].push(fileName);
      });
    }
    return selected;
  }, [location.state]);

  const handleFilesOpened = useCallback((allResults) => {
    previousStatisticsRef.current = null;
    hiddenFeaturesRef.current = new Set();
    dispatchSelection({type:"clear"});
    baselineResultsRef.current = allResults;
    setFilters([]);
    setFilterLogic({ operators: {}, operator: "AND", matchColumns: true });
    setCustomMappings(null);
    setDataResults(allResults);
    setActiveFileIndices(allResults.map(() => true));
  }, []);

  const updateFeatureTypes = changes => {
    const update = source => changes.reduce((current, change) => updateSourceFeature(current, change), source);
    baselineResultsRef.current = baselineResultsRef.current.map(update);
    setCustomMappings(previous => previous && reconcileMappingTypes(previous, baselineResultsRef.current));
    setDataResults(previous => previous.map(update));
  };

  const filterStatistics = useMemo(() => combineSelectedData(
    baselineResultsRef.current.length ? baselineResultsRef.current : dataResults,
    dataResults.map(() => true)
  ), [dataResults, combineSelectedData]);
  const columnMappings = useMemo(() => customMappings ?? createColumnMappings(baselineResultsRef.current), [customMappings, dataResults]);
  const appliedFilters = useMemo(() => buildAppliedFilters(filterStatistics, filters, filterLogic, dataResults, columnMappings), [filterStatistics, filters, filterLogic, dataResults, columnMappings]);
  const activeMappings = useMemo(() => activeColumnMappings(columnMappings, dataResults, activeFileIndices), [columnMappings, dataResults, activeFileIndices]);
  const combinedTablesActive = combineTables && activeMappings.length > 0;
  const tableStatistics = useMemo(() => !combinedTablesActive || !filteredDataStatistics ? filteredDataStatistics
    : combineMappedTableData(filteredDataStatistics, dataResults, activeFileIndices, columnMappings),
  [combinedTablesActive, filteredDataStatistics, dataResults, activeFileIndices, columnMappings]);
  const relationships = useRelationshipStatistics(combinedTablesActive ? tableStatistics : filteredDataStatistics,
    dataResults, combinedTablesActive, !showIndividualView || exportRelationships);
  const relationshipStatistics = relationships.statistics;
  const statisticsBusy = isCombining || relationships.pending;
  const relationshipFilters = useMemo(() => tableFilterDescriptions(combinedTablesActive ? tableStatistics : filteredDataStatistics, appliedFilters), [combinedTablesActive, tableStatistics, filteredDataStatistics, appliedFilters]);
  const featureFilters = useMemo(() => tableFilterDescriptions(tableStatistics, appliedFilters), [tableStatistics, appliedFilters]);
  const statisticsExport = useMemo(() => ({ data: tableStatistics, sourceData: filteredDataStatistics, appliedFilters }),
    [tableStatistics, filteredDataStatistics, appliedFilters]);
  const selectFeature = useCallback((entry, event) => {
    const feature = selectableFeatures(entry.pooled ? tableStatistics : filteredDataStatistics)
      .find(feature => feature.featureName === entry.featureName);
    if (feature) dispatchSelection({type:"select", entry:feature, additive:!!(event?.additive || event?.ctrlKey || event?.metaKey)});
  }, [tableStatistics, filteredDataStatistics]);
  useEffect(() => {
    dispatchSelection({type:"reconcile", statistics:filteredDataStatistics, tableStatistics});
  }, [filteredDataStatistics, tableStatistics]);
  const selectedSourceFeatures = useMemo(() => sourceFeatureSelection(selectedEntries, filteredDataStatistics), [selectedEntries, filteredDataStatistics]);

  const applyColumnMappings = async next => {
    const invalid = validateColumnMappings(next, baselineResultsRef.current);
    if (invalid) throw new Error(invalid);
    setIsCombining(true);
    try {
      // A changed correspondence also changes the scope of linked filters. Refresh all
      // sites before committing either mappings or results so the cohort stays consistent.
      if (filterLogic.matchColumns && Object.values(filters || {}).some(conditions => conditions?.length)) {
        const updated = await filterDiscoveryDatasets(dataResults, selectedNodes, source => {
          const conditions = fileFilterConditions(filterStatistics, filters, filterLogic.operators, source, dataResults.length, true, next);
          return Object.keys(conditions).length ? { conditions, operator: filterLogic.operator } : null;
        }, {signal: refreshControllerRef.current?.signal});
        setDataResults(updated);
      }
      setCustomMappings(next);
      setCombineTables(next.length > 0);
    } finally { setIsCombining(false); }
  };
  const tableActions = name => dataResults.length > 1 ? <TableMergeControl tableName={name}
    combined={combinedTablesActive} onChange={setCombineTables} onEditMappings={() => setMappingDialogOpen(true)}
    mappingCount={columnMappings.length} disabled={statisticsBusy} /> : null;

  const closeFilters = useCallback(() => setIsFiltersopen(false), []);
  const toggleFilters = useCallback(() => setIsFiltersopen((open) => !open), []);
  const clearOutsideSelection = useCallback(event => {
    if (!event.target.closest?.('[data-feature-selection], button, input, select, textarea, label, a, [role="dialog"], [role="menu"], [role="combobox"], [role="separator"]'))
      dispatchSelection({type:"clear"});
  }, []);

  return (
    <div className={DiscoveryStyles.dropContainer} onClick={clearOutsideSelection}>
      <FilterModal
        refreshControllerRef={refreshControllerRef}
        isOpen={isFiltersOpen}
        dataStatistics={filterStatistics}
        filters={filters}
        setFilters={setFilters}
        setFilteredDataStatistics={setFilteredDataStatistics}
        closeModal={closeFilters}
        dataResults={dataResults}
        activeFileIndices={activeFileIndices}
        setDataResults={setDataResults}
        combineSelectedData={combineSelectedData}
        setDataStatistics={setDataStatistics}
        filterLogic={filterLogic}
        setFilterLogic={setFilterLogic}
        onFilteringChange={setIsCombining}
        columnMappings={columnMappings}
        selectedEntries={selectedSourceFeatures}
      />
      {mappingDialogOpen && <ColumnMappingsDialog open mappings={columnMappings} sources={baselineResultsRef.current}
        appliedFilters={appliedFilters} selectedFeatures={selectedSourceFeatures} onClose={() => setMappingDialogOpen(false)} onApply={applyColumnMappings} />}
      {!filteredDataStatistics && (
        <FileExplorer
          nodes={selectedNodes}
          category="DATASETS"
          isOpen={true}
          preSelectedFiles={preSelected}
          autoProcess={!!location.state?.elementFiles?.length}
          onFilesOpened={handleFilesOpened}
        />
      )}
      <CSSTransition
        in={!!filteredDataStatistics}
        classNames={{
          enter: DiscoveryStyles.toolTrayEnter,
          enterActive: DiscoveryStyles.toolTrayEnterActive,
          exit: DiscoveryStyles.toolTrayExit,
          exitActive: DiscoveryStyles.toolTrayExitActive,
        }}
        timeout={300}
        unmountOnExit
      >
        <ToolTray
          refreshControllerRef={refreshControllerRef}
          data={dataStatistics}
          filteredData={filteredDataStatistics}
          setFilteredData={setFilteredDataStatistics}
          setData={setDataStatistics}
          showOutliers={showOutliers}
          setShowOutliers={setShowOutliers}
          isToolTrayOpen={isToolTrayOpen}
          toggleToolTray={toggleToolTray}
          selectedEntries={selectedEntries}
          selectedSourceFeatures={selectedSourceFeatures}
          filters={filters}
          toggleFilters={toggleFilters}
          showIndividualView={showIndividualView}
          toggleView={toggleView}
          isCombining={statisticsBusy}
          statisticsExport={statisticsExport}
          onExportRelationshipsChange={setExportRelationships}
          relationshipExport={{ data: relationshipStatistics, pending: relationships.pending, error: relationships.error, active: !showIndividualView }}
          appliedFilters={appliedFilters}
          featureFilters={featureFilters}
          onFeatureRecalculated={updateFeatureTypes}
          onTypeChanging={setIsCombining}
          dataResults={dataResults}
          activeFileIndices={activeFileIndices}
          toggleFileActive={toggleFileActive}
        />
      </CSSTransition>
      <CSSTransition
        in={!!filteredDataStatistics}
        classNames={{
          enter: DiscoveryStyles.statisticsEnter,
          enterActive: DiscoveryStyles.statisticsEnterActive,
          exit: DiscoveryStyles.statisticsExit,
          exitActive: DiscoveryStyles.statisticsExitActive,
        }}
        timeout={300}
        unmountOnExit
      >
        <div className={DiscoveryStyles.statisticsContainer} aria-busy={statisticsBusy}>
          {statisticsBusy && <div className={DiscoveryStyles.calculationStatus} role="status">
            <span>{relationships.pending ? "Calculating relationships…" : "Refreshing statistics…"}</span>
            <LinearProgress aria-label={relationships.pending ? "Calculating relationships" : "Refreshing statistics"} />
          </div>}
          {relationships.error && <div className={DiscoveryStyles.calculationStatus} role="alert">
            <span>{relationships.error}</span><button onClick={relationships.retry}>Retry calculation</button>
          </div>}
          <TransitionGroup>
            {showIndividualView ? (
              <CSSTransition
                key="statistics"
                classNames={{
                  enter: DiscoveryStyles.fadeEnter,
                  enterActive: DiscoveryStyles.fadeEnterActive,
                  exit: DiscoveryStyles.fadeExit,
                  exitActive: DiscoveryStyles.fadeExitActive,
                }}
                timeout={200}
              >
                <div>
                  <StatisticsDisplay
                    data={filteredDataStatistics}
                    tableData={tableStatistics}
                    combinedTables={combinedTablesActive}
                    featureFilters={featureFilters}
                    appliedFilters={appliedFilters}
                    numericalTableActions={tableActions("Numerical")}
                    categoricalTableActions={tableActions("Categorical")}
                    showOutliers={showOutliers}
                    onSelectFeature={selectFeature}
                    selectedEntries={selectedEntries}
                    selectedSourceFeatures={selectedSourceFeatures}
                  />
                </div>
              </CSSTransition>
            ) : (
              <CSSTransition
                key="aggregate"
                classNames={{
                  enter: DiscoveryStyles.fadeEnter,
                  enterActive: DiscoveryStyles.fadeEnterActive,
                  exit: DiscoveryStyles.fadeExit,
                  exitActive: DiscoveryStyles.fadeExitActive,
                }}
                timeout={200}
              >
                <div>
                  <AggregateDisplay
                    {...relationshipStatistics}
                    featureFilters={relationshipFilters}
                  />
                </div>
              </CSSTransition>
            )}
          </TransitionGroup>
        </div>
      </CSSTransition>
      <ToastContainer
        autoClose={2000}
        hideProgressBar={true}
        className={DiscoveryStyles.toastContainer}
        toastClassName={DiscoveryStyles.toast}
      />
    </div>
  );
}

export default Discovery;
