import React, { useState } from "react";
import { MdChevronRight, MdChevronLeft, MdSync } from "react-icons/md";
import Switch from "react-switch";
import { toast } from "react-toastify";
import ToolTrayStyles from "./toolTray.module.css";
import DataExporter from "../DataExporter/dataExporter";
import ElementExporter from "../../Integration/ElementExporter/elementExporter";
import CompareFilesModal from "../../Integration/CompareFilesModal/compareFilesModal";
import { recalculateFeature } from "../../../util/petitionHandler";
import { updateNodeAxiosBaseURL } from "../../../util/nodeAxiosSetup";
import { useNode } from "../../../context/nodeContext";

function ToolTray({
  data,
  filteredData,
  setFilteredData,
  setData,
  showOutliers,
  setShowOutliers,
  isToolTrayOpen,
  toggleToolTray,
  selectedEntry,
  setSelectedEntry,
  showIndividualView,
  toggleView,
  filters,
  toggleFilters,
  dataResults = [],
  activeFileIndices = [],
  toggleFileActive,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { selectedNodes } = useNode();

  // Creates a ripple effect on click.
  const createRipple = (e) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const circle = document.createElement("span");
    const diameter = Math.max(rect.width, rect.height);
    const radius = diameter / 2;
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - rect.left - radius}px`;
    circle.style.top = `${e.clientY - rect.top - radius}px`;
    circle.classList.add(ToolTrayStyles.ripple);
    const ripple = target.getElementsByClassName(ToolTrayStyles.ripple)[0];
    if (ripple) {
      ripple.remove();
    }
    target.appendChild(circle);
    setTimeout(() => {
      circle.remove();
    }, 600);
  };

  // Returns all features from the combined data (with fileName).
  const getEntrySet = (dataSet) => {
    if (!dataSet) return [];
    let entries = [];
    if (dataSet.dateFeatures) {
      entries = entries.concat(
        dataSet.dateFeatures.map((item) => ({
          featureName: item.featureName,
          type: "date",
          fileName: item.fileName,
        }))
      );
    }
    if (dataSet.categoricalFeatures) {
      entries = entries.concat(
        dataSet.categoricalFeatures.map((item) => ({
          featureName: item.featureName,
          type: "categorical",
          fileName: item.fileName,
        }))
      );
    }
    if (dataSet.continuousFeatures) {
      entries = entries.concat(
        dataSet.continuousFeatures.map((item) => ({
          featureName: item.featureName,
          type: "continuous",
          fileName: item.fileName,
        }))
      );
    }
    return entries;
  };

  // Extract the original feature name from "FeatureName (FileName)".
  const getOriginalFeatureName = (name) => {
    const idx = name.indexOf(" (");
    return idx !== -1 ? name.substring(0, idx) : name;
  };

  // Determine the file name by dissecting the selectedEntry's featureName.
  const lookupFileName = () => {
    console.log("lookupFileName: selectedEntry =", selectedEntry);
    if (!selectedEntry) return undefined;
    if (selectedEntry.fileName) {
      console.log(
        "lookupFileName: using fileName from selectedEntry =",
        selectedEntry.fileName
      );
      return selectedEntry.fileName;
    }
    const regex = /^(.*)\s+\(([^)]+)\)$/;
    const match = selectedEntry.featureName.match(regex);
    if (!match) {
      console.warn("lookupFileName: pattern not matched, returning undefined");
      return undefined;
    }
    const originalName = match[1].trim();
    const fileLabel = match[2].trim();
    console.log("lookupFileName: originalName =", originalName, "| fileLabel =", fileLabel);
    const allEntries = getEntrySet(data);
    console.log("lookupFileName: allEntries =", allEntries);
    const found = allEntries.find(
      (entry) =>
        getOriginalFeatureName(entry.featureName) === originalName &&
        entry.fileName === fileLabel &&
        entry.type === selectedEntry.type
    );
    if (!found) {
      console.error("lookupFileName: No matching entry found for", selectedEntry);
      return undefined;
    }
    console.log("lookupFileName: Found matching entry, fileName =", found.fileName);
    return found.fileName;
  };

  // Check if a given feature is currently "checked" in the filtered data.
  const isFeatureChecked = (featureName, featureType) => {
    return filteredData[`${featureType}Features`]?.some(
      (item) => item.featureName === featureName
    );
  };

  // Toggle between feature types.
  const toggleFeatureType = async () => {
    if (!selectedEntry) return;
    setIsLoading(true);
    try {
      const newType =
        selectedEntry.type === "categorical" ? "continuous" : "categorical";
      const fileName = lookupFileName();
      if (!fileName) {
        console.error("toggleFeatureType: No valid fileName found. Abort.");
        setIsLoading(false);
        return;
      }
      // Try to find the node using selectedEntry.nodeId; if not, fallback using dataResults.
      let nodeForFeature = selectedEntry.nodeId
        ? selectedNodes.find((n) => n.nodeId === selectedEntry.nodeId)
        : null;
      if (!nodeForFeature) {
        const fallback = dataResults.find((r) => r.fileName === fileName && r.nodeId);
        if (fallback) {
          nodeForFeature = selectedNodes.find((n) => n.nodeId === fallback.nodeId);
          if (fallback.nodeId) {
            setSelectedEntry((prev) => ({ ...prev, nodeId: fallback.nodeId }));
          }
        }
      }
      if (!nodeForFeature || !nodeForFeature.serviceUrl) {
        console.error(
          "toggleFeatureType: No matching node with serviceUrl found for selected feature."
        );
        setIsLoading(false);
        return;
      }
      // Update axios base URL for the appropriate node.
      updateNodeAxiosBaseURL(nodeForFeature.serviceUrl);

      const normalizedFeatureName = getOriginalFeatureName(selectedEntry.featureName);
      console.log("toggleFeatureType: calling recalculateFeature with", {
        fileName,
        featureName: selectedEntry.featureName,
        newType,
      });
      const recalcData = await recalculateFeature(
        fileName,
        selectedEntry.featureName,
        newType
      );
      console.log("toggleFeatureType: recalcData =", recalcData);

      // If the response contains a failure message, do not update state.
      if (
        recalcData.message &&
        recalcData.message.toLowerCase().includes("cannot be converted")
      ) {
        toast.error("Feature conversion failed: " + recalcData.message);
        setIsLoading(false);
        return;
      }
      // Also, if the expected target array is empty, treat that as a failure.
      const targetArray =
        newType === "categorical"
          ? "categoricalFeatures"
          : newType === "continuous"
            ? "continuousFeatures"
            : "dateFeatures";
      if (!recalcData[targetArray] || recalcData[targetArray].length === 0) {
        toast.error("Feature conversion failed: No features returned for conversion.");
        setIsLoading(false);
        return;
      }

      let finalType = "continuous";
      if (
        recalcData.dateFeatures?.some(
          (f) => getOriginalFeatureName(f.featureName) === normalizedFeatureName
        )
      ) {
        finalType = "date";
      } else if (
        recalcData.categoricalFeatures?.some(
          (f) => getOriginalFeatureName(f.featureName) === normalizedFeatureName
        )
      ) {
        finalType = "categorical";
      }
      console.log("toggleFeatureType: finalType decided as =>", finalType);

      const newData = { ...data };
      // Remove the original feature from all arrays.
      ["dateFeatures", "categoricalFeatures", "continuousFeatures"].forEach(
        (arrayName) => {
          newData[arrayName] =
            newData[arrayName]?.filter(
              (item) => item.featureName !== selectedEntry.featureName
            ) || [];
        }
      );

      const newTargetArray = `${finalType}Features`;
      if (recalcData[newTargetArray]) {
        const newFeatures = recalcData[newTargetArray].map((f) => ({
          ...f,
          fileName: fileName,
          originalName: normalizedFeatureName,
          featureName: `${normalizedFeatureName} (${fileName})`,
        }));
        console.log(
          "toggleFeatureType: adding features to newData[" + newTargetArray + "]:",
          newFeatures
        );
        newData[newTargetArray] = [...(newData[newTargetArray] || []), ...newFeatures];
      }
      if (recalcData.chiSquareTest) {
        console.log(
          "toggleFeatureType: updating chiSquareTest from recalcData =>",
          recalcData.chiSquareTest
        );
        newData.chiSquareTest = recalcData.chiSquareTest;
      }
      console.log("toggleFeatureType: setting new data in state =>", newData);
      setData(newData);
      setFilteredData(newData);
      const updatedType = finalType === "date" ? "continuous" : finalType;
      setSelectedEntry({
        ...selectedEntry,
        type: updatedType,
        featureName: `${normalizedFeatureName} (${fileName})`,
      });
    } catch (error) {
      console.error("Feature recalculation failed:", error);
      toast.error("Feature recalculation failed: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Group dataResults by nodeId for the multi-file selector.
  const groupedFiles = dataResults.reduce((acc, file) => {
    const key = file.nodeId;
    if (!acc[key]) {
      acc[key] = {
        nodeName: file.nodeName || `Node ${file.nodeId}`,
        files: [],
      };
    }
    acc[key].files.push(file);
    return acc;
  }, {});

  // Get the unfiltered entry set
  const entrySet = getEntrySet(data);

  // Filter entries based on the search term
  const displayedFeatures = entrySet.filter((entry) =>
    entry.featureName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if all displayed features are currently toggled on
  const allDisplayedChecked = displayedFeatures.every((entry) =>
    isFeatureChecked(entry.featureName, entry.type)
  );

  // Toggle all displayed features on or off
  const toggleAllDisplayedFeatures = () => {
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
  };

  return (
    <div
      className={`${ToolTrayStyles.container} ${isToolTrayOpen ? ToolTrayStyles.open : ToolTrayStyles.closed
        }`}
    >
      {/* Toggle arrow */}
      <div className={ToolTrayStyles.toggleButton} onClick={toggleToolTray}>
        {isToolTrayOpen ? <MdChevronLeft /> : <MdChevronRight />}
      </div>

      {/* Selected entry info */}
      <div className={ToolTrayStyles.topSection}>
        {selectedEntry && selectedEntry.featureName ? (
          <>
            <h3>{selectedEntry.featureName}</h3>
            <button
              className={`${ToolTrayStyles.toggleFeatureTypeButton} ${isLoading ? ToolTrayStyles.loading : ""
                }`}
              onClick={toggleFeatureType}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className={ToolTrayStyles.spinner}></div>
              ) : (
                <>
                  <span className={ToolTrayStyles.entryType}>
                    {(selectedEntry?.type || "").toUpperCase()}
                  </span>
                  <MdSync className={ToolTrayStyles.iconSpin} />
                </>
              )}
            </button>
          </>
        ) : (
          <h3>No entry selected</h3>
        )}
      </div>

      {/* Multi-file selector */}
      {dataResults.length > 1 && (
        <div className={ToolTrayStyles.multiFileSelector}>
          {Object.values(groupedFiles).map((group, groupIndex) => (
            <div key={groupIndex} className={ToolTrayStyles.nodeGroup}>
              <h4 className={ToolTrayStyles.nodeGroupTitle}>{group.nodeName}</h4>
              <div className={ToolTrayStyles.filesRow}>
                {group.files.map((file, fileIndex) => {
                  const idx = dataResults.findIndex(
                    (r) => r.nodeId === file.nodeId && r.fileName === file.fileName
                  );
                  const isActive = activeFileIndices[idx];
                  return (
                    <label
                      key={fileIndex}
                      className={`${ToolTrayStyles.fileToggle} ${isActive ? ToolTrayStyles.fileToggleActive : ""
                        }`}
                      title={file.fileName}
                      onClick={createRipple}
                    >
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => toggleFileActive(idx)}
                      />
                      <span className={ToolTrayStyles.fileNameEllipsis}>
                        {file.fileName}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feature toggles */}
      <div className={ToolTrayStyles.featuresList}>
        <ul>
          {displayedFeatures.map((entry) => (
            <li key={entry.featureName} className={ToolTrayStyles.featureItem}>
              <label title={entry.featureName}>
                <Switch
                  checked={isFeatureChecked(entry.featureName, entry.type)}
                  onChange={() =>
                    setFilteredData((prev) => {
                      const featKey = `${entry.type}Features`;
                      const newFiltered = { ...prev };
                      const arr = [...(newFiltered[featKey] || [])];
                      const i = arr.findIndex(
                        (f) => f.featureName === entry.featureName
                      );
                      if (i >= 0) {
                        arr.splice(i, 1);
                      } else {
                        const item = data[featKey]?.find(
                          (f) => f.featureName === entry.featureName
                        );
                        if (item) arr.push(item);
                      }
                      newFiltered[featKey] = arr;
                      return newFiltered;
                    })
                  }
                  height={20}
                  width={40}
                  handleDiameter={16}
                  offColor="#888"
                  onColor="#9ABDDC"
                />
                {entry.featureName}
              </label>
            </li>
          ))}
        </ul>
      </div>

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

      {/* Outliers switch */}
      <div className={ToolTrayStyles.buttonContainer}>
        <label htmlFor="toggleOutliers" className={ToolTrayStyles.outliersLabel}>
          <Switch
            checked={showOutliers}
            onChange={setShowOutliers}
            id="toggleOutliers"
            height={20}
            width={40}
            handleDiameter={16}
            offColor="#888"
            onColor="#9ABDDC"
            className={ToolTrayStyles.outliersSwitch}
          />
          {showOutliers ? "Outliers shown" : "Outliers hidden"}
        </label>
      </div>

      {/* Switch between Individual vs Aggregate view */}
      <div className={ToolTrayStyles.buttonContainer}>
        <button onClick={toggleView}>
          {showIndividualView ? "Display aggregate metrics" : "Display individual metrics"}
        </button>
      </div>

      {/* Filters */}
      <div className={ToolTrayStyles.buttonContainer}>
        <button onClick={toggleFilters}>
          {filters.length ? "Filters added" : "Set filters"}
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
        <DataExporter data={data} filteredData={filteredData} />
      </div>

      {/* Element exporter */}
      <div className={ToolTrayStyles.buttonContainer}>
        <ElementExporter
          dataResults={dataResults}
          activeFileIndices={activeFileIndices}
          combinedData={data}
          filteredData={filteredData}
        />
      </div>
    </div>
  );
}

export default ToolTray;