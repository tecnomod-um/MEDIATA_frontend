import React, { useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import DiscoveryStyles from "./discovery.module.css";
// eslint-disable-next-line no-unused-vars
import FilePicker from "../../components/Common/FilePicker/filePicker";
import FileExplorer from "../../components/Common/FilePicker/fileExplorer"; 
import StatisticsDisplay from "../../components/Discovery/StatisticsDisplay/statisticsDisplay";
import ToolTray from "../../components/Discovery/ToolTray/toolTray";
import AggregateDisplay from "../../components/Discovery/AggregatesDisplay/aggregateDisplay";
import FilterModal from "../../components/Discovery/FilterModal/filterModal";
import { ToastContainer, toast } from "react-toastify";
import { getNodeDatasets, processSelectedDatasets, getProcessSelectedDatasetsStatus, getProcessSelectedDatasetsResult } from "../../util/petitionHandler";
import { updateNodeAxiosBaseURL } from "../../util/nodeAxiosSetup";

import { useNode } from "../../context/nodeContext";

function Discovery() {
  const [dataResults, setDataResults] = useState([]);
  const [activeFileIndices, setActiveFileIndices] = useState([]);
  const [dataStatistics, setDataStatistics] = useState(null);
  const [filteredDataStatistics, setFilteredDataStatistics] = useState(null);

  const [showIndividualView, toggleShownView] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOutliers, setShowOutliers] = useState(false);
  const [isToolTrayOpen, setIsToolTrayOpen] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [isFiltersOpen, setIsFiltersopen] = useState(false);
  const [filters, setFilters] = useState([]);

  const [progressMode, setProgressMode] = useState("spinner");
  const [progressValue, setProgressValue] = useState(0);

  const [hasProcessedMappingState, setHasProcessedMappingState] = useState(false);
  const { selectedNodes } = useNode();
  // eslint-disable-next-line no-unused-vars
  const [datasets, setDatasets] = useState([]);
  const location = useLocation();
  const toggleToolTray = () => setIsToolTrayOpen(!isToolTrayOpen);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const pollDiscoveryJob = useCallback(async (jobId, onProgress) => {
    while (true) {
      const status = await getProcessSelectedDatasetsStatus(jobId);
      if (typeof status?.percent === "number") onProgress(status.percent);
  
      const state = String(status?.state || "").toUpperCase();
      if (state === "DONE") {
        const results = await getProcessSelectedDatasetsResult(jobId);
        return results || [];
      }
      if (state === "ERROR") throw new Error(status.message || "Discovery job failed");
  
      await sleep(500);
    }
  }, []);
  
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
              const result = await processSelectedDatasets(filesForNode);

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
                setProgressMode("bar"); // optional
                const arr = await pollDiscoveryJob(result.jobId, () => {}); // no progress needed here
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
          setDataResults(allResults);
          setActiveFileIndices(allResults.map(() => true));
        } catch (error) {
          console.error("Error processing parsed element files:", error);
          toast.error("Error processing parsed element files: " + error.message);
        }
      })();
      setHasProcessedMappingState(true);
    }
  }, [location.state, selectedNodes, dataResults.length, hasProcessedMappingState, pollDiscoveryJob]);

  const combineSelectedData = (dataResultsArray, activeIndices) => {
    const combined = {
      continuousFeatures: [],
      categoricalFeatures: [],
      dateFeatures: [],
      chiSquareTest: [],
      covariances: {},
      pearsonCorrelations: {},
      spearmanCorrelations: {},
      omittedFeatures: [],
    };

    dataResultsArray.forEach((res, idx) => {
      if (!activeIndices[idx]) return; // skip non-active files
      const fileLabel = res.fileName || `File #${idx + 1}`;

      res.continuousFeatures?.forEach((item) => {
        const newItem = { ...item };
        newItem.originalName = item.featureName;
        newItem.featureName = `${item.featureName} (${fileLabel})`;
        newItem.fileName = res.fileName || fileLabel;
        combined.continuousFeatures.push(newItem);
      });

      res.categoricalFeatures?.forEach((item) => {
        const newItem = { ...item };
        newItem.originalName = item.featureName;
        newItem.featureName = `${item.featureName} (${fileLabel})`;
        newItem.fileName = res.fileName || fileLabel;
        combined.categoricalFeatures.push(newItem);
      });

      res.dateFeatures?.forEach((item) => {
        const newItem = { ...item };
        newItem.originalName = item.featureName;
        newItem.featureName = `${item.featureName} (${fileLabel})`;
        newItem.fileName = res.fileName || fileLabel;
        combined.dateFeatures.push(newItem);
      });

      if (res.chiSquareTest)
        combined.chiSquareTest = combined.chiSquareTest.concat(res.chiSquareTest);
      if (res.covariances) {
        Object.keys(res.covariances).forEach((k) => {
          combined.covariances[k] = {
            ...(combined.covariances[k] || {}),
            ...res.covariances[k],
          };
        });
      }
      if (res.pearsonCorrelations) {
        Object.keys(res.pearsonCorrelations).forEach((k) => {
          combined.pearsonCorrelations[k] = {
            ...(combined.pearsonCorrelations[k] || {}),
            ...res.pearsonCorrelations[k],
          };
        });
      }
      if (res.spearmanCorrelations) {
        Object.keys(res.spearmanCorrelations).forEach((k) => {
          combined.spearmanCorrelations[k] = {
            ...(combined.spearmanCorrelations[k] || {}),
            ...res.spearmanCorrelations[k],
          };
        });
      }
      if (res.omittedFeatures) {
        combined.omittedFeatures = combined.omittedFeatures.concat(res.omittedFeatures);
      }
    });

    return combined;
  };

  useEffect(() => {
    if (dataResults.length) {
      const combined = combineSelectedData(dataResults, activeFileIndices);
      setDataStatistics(combined);
      setFilteredDataStatistics(combined);
    }
  }, [dataResults, activeFileIndices]);

  const toggleFileActive = (index) => {
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
  };

  // eslint-disable-next-line no-unused-vars
  const handleProcessSelectedDatasets = async (selectedFilenamesMapping) => {
    setIsProcessing(true);
    setProgressMode("spinner");
    setProgressValue(0);
  
    try {
      const allResults = [];
      const perNodePercent = {};
  
      const updateOverallProgress = () => {
        const vals = Object.values(perNodePercent);
        const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        setProgressValue(avg);
      };
  
      await Promise.all(
        selectedNodes.map(async (node) => {
          const filesForNode = selectedFilenamesMapping[node.nodeId] || [];
          if (!filesForNode.length) return;
  
          updateNodeAxiosBaseURL(node.serviceUrl);
  
          const result = await processSelectedDatasets(filesForNode);
  
          if (result.mode === "sync") {
            const arr = result.results || [];
            allResults.push(
              ...arr.map((r) => ({
                ...r,
                fileName: r.fileName || "Unknown File",
                nodeId: node.nodeId,
                nodeName: node.name,
              }))
            );
            return;
          }
  
          if (result.mode === "async") {
            setProgressMode("bar");
            perNodePercent[node.nodeId] = 0;
            updateOverallProgress();
  
            const arr = await pollDiscoveryJob(result.jobId, (p) => {
              perNodePercent[node.nodeId] = p;
              updateOverallProgress();
            });
  
            allResults.push(
              ...arr.map((r) => ({
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
  
      setDataResults(allResults);
      setActiveFileIndices(allResults.map((_, idx) => idx === 0));
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Error processing datasets");
    } finally {
      setIsProcessing(false);
      setProgressMode("spinner");
      setProgressValue(0);
    }
  };

  useEffect(() => {
    if (selectedNodes && selectedNodes.length > 0) {
      const fetchDatasets = async () => {
        try {
          const results = await Promise.all(
            selectedNodes.map(async (node) => {
              updateNodeAxiosBaseURL(node.serviceUrl);
              const data = await getNodeDatasets();
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
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (viewportWidth > 768) setIsToolTrayOpen(true);
    else setIsToolTrayOpen(false);
  }, [viewportWidth]);

  let preSelected = {};
  if (location.state?.elementFiles?.length) {
    location.state.elementFiles.forEach(({ nodeId, fileName }) => {
      if (!preSelected[nodeId]) preSelected[nodeId] = [];
      preSelected[nodeId].push(fileName);
    });
  }
  const handleOpenFromExplorer = async (fileName) => {
    if (!selectedNodes?.length) {
      toast.error("No node selected.");
      return;
    }

    // Basic version: use FIRST node only (predictable).
    const node = selectedNodes[0];

    setIsProcessing(true);
    setProgressMode("spinner");
    setProgressValue(0);

    try {
      updateNodeAxiosBaseURL(node.serviceUrl);

      const result = await processSelectedDatasets([fileName]);

      if (result.mode === "sync") {
        const arr = result.results || [];
        const allResults = arr.map((r) => ({
          ...r,
          fileName: r.fileName || fileName,
          nodeId: node.nodeId,
          nodeName: node.name,
        }));
        setDataResults(allResults);
        setActiveFileIndices(allResults.map((_, idx) => idx === 0));
        return;
      }

      if (result.mode === "async") {
        setProgressMode("bar");
        const arr = await pollDiscoveryJob(result.jobId, (p) => setProgressValue(p));
        const allResults = (arr || []).map((r) => ({
          ...r,
          fileName: r.fileName || fileName,
          nodeId: node.nodeId,
          nodeName: node.name,
        }));
        setDataResults(allResults);
        setActiveFileIndices(allResults.map((_, idx) => idx === 0));
        return;
      }

      throw new Error("Unexpected response from processList");
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Error processing dataset");
    } finally {
      setIsProcessing(false);
      setProgressMode("spinner");
      setProgressValue(0);
    }
  };
  console.log(dataStatistics)
  return (
    <div className={DiscoveryStyles.dropContainer}>
      <FilterModal
        isOpen={isFiltersOpen}
        dataStatistics={dataStatistics}
        filters={filters}
        setFilters={setFilters}
        setFilteredDataStatistics={setFilteredDataStatistics}
        closeModal={() => setIsFiltersopen(false)}
        dataResults={dataResults}
        activeFileIndices={activeFileIndices}
        setDataResults={setDataResults}
        combineSelectedData={combineSelectedData}
        setDataStatistics={setDataStatistics}
      />
      {/*!filteredDataStatistics && (
        <FilePicker
          files={datasets}
          onFilesSelected={handleProcessSelectedDatasets}
          isProcessing={isProcessing}
          modalTitle="Select dataset files to process"
          preSelectedFiles={preSelected}
          autoProcess={!!location.state?.elementFiles?.length}

          progressMode={progressMode}
          progressValue={progressValue}
        />
      )*/}
            {/* Show explorer when we have not loaded data yet */}
            {!filteredDataStatistics && (
        <FileExplorer
          category="DATASETS"
          isOpen={true}
          modalTitle={
            isProcessing
              ? (progressMode === "bar" ? `Processing… ${Math.round(progressValue)}%` : "Processing…")
              : "Browse datasets (double-click to open)"
          }
          onOpenFile={handleOpenFromExplorer}
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
          data={dataStatistics}
          filteredData={filteredDataStatistics}
          setFilteredData={setFilteredDataStatistics}
          setData={setDataStatistics}
          showOutliers={showOutliers}
          setShowOutliers={setShowOutliers}
          isToolTrayOpen={isToolTrayOpen}
          toggleToolTray={toggleToolTray}
          selectedEntry={selectedEntry}
          setSelectedEntry={setSelectedEntry}
          showIndividualView={showIndividualView}
          toggleView={() => toggleShownView((v) => !v)}
          filters={filters}
          toggleFilters={() => setIsFiltersopen((open) => !open)}
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
        <div className={DiscoveryStyles.statisticsContainer}>
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
                    showOutliers={showOutliers}
                    setSelectedEntry={setSelectedEntry}
                    selectedEntry={selectedEntry}
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
                    covariances={filteredDataStatistics?.covariances}
                    pearsonCorrelations={filteredDataStatistics?.pearsonCorrelations}
                    spearmanCorrelations={filteredDataStatistics?.spearmanCorrelations}
                    chiSquareTest={filteredDataStatistics?.chiSquareTest}
                    omittedFeatures={filteredDataStatistics?.omittedFeatures}
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