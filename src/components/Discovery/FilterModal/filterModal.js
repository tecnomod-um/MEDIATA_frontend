import React, { useState, useEffect, useRef } from "react";
import OverlayWrapper from "../../Common/OverlayWrapper/overlayWrapper";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Select from "react-select";
import FilterModalStyles from "./filterModal.module.css";
import TooltipPopup from "../../Common/TooltipPopup/tooltipPopup";
import { IoMdClose } from "react-icons/io";
import { toast } from "react-toastify";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { filterMultipleFiles } from "../../../util/petitionHandler";
import { updateNodeAxiosBaseURL } from "../../../util/nodeAxiosSetup";
import { useNode } from "../../../context/nodeContext";

const initializeFilters = (dataStatistics) => {
  if (!dataStatistics) return {};
  const filters = {};
  const allFeatures = [
    ...(dataStatistics.categoricalFeatures || []),
    ...(dataStatistics.continuousFeatures || []),
    ...(dataStatistics.dateFeatures || []),
  ];
  allFeatures.forEach((feature) => {
    filters[feature.featureName] = null;
  });
  return filters;
};

// Modal that works with the features in dataStatistics. Allows to build a filter query for the backend to repopulate dataResults
const FilterModal = ({ isOpen, dataStatistics, closeModal, filters, setFilters, setFilteredDataStatistics, dataResults, activeFileIndices, setDataResults, combineSelectedData, setDataStatistics }) => {
  const [filterConditions, setFilterConditions] = useState({});
  const [logicalOperators, setLogicalOperators] = useState({});
  const [globalLogicalOperator, setGlobalLogicalOperator] = useState("AND");

  const [selectedFeature, setSelectedFeature] = useState("");
  const [dateFilterType, setDateFilterType] = useState("equal");
  const [dateValue, setDateValue] = useState(new Date());
  const [dateRange, setDateRange] = useState([new Date(), new Date()]);
  const [continuousFilterType, setContinuousFilterType] = useState("equal");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const addButtonRef = useRef(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const { selectedNodes } = useNode();

  // Initialize local filter placeholders whenever dataStatistics changes
  useEffect(() => {
    if (dataStatistics) {
      setFilterConditions(initializeFilters(dataStatistics));
    }
  }, [dataStatistics]);

  const handleApplyFilters = async () => {
    setIsLoading(true);
    try {
      const multipleFileFilters = dataResults.map((fileResult, idx) => {
        const basePayload = {
          fileName: fileResult.fileName,
          nodeId: fileResult.nodeId
        };
        if (!activeFileIndices[idx]) {
          return { ...basePayload, filters: null };
        }
        const fileSpecificConditions = {};
        for (let feature in filterConditions) {
          if (
            feature.endsWith(`(${fileResult.fileName})`) &&
            filterConditions[feature]?.length > 0
          ) {
            fileSpecificConditions[feature] = {
              conditions: filterConditions[feature],
              operators: logicalOperators[feature] || [],
            };
          }
        }
        if (Object.keys(fileSpecificConditions).length === 0) {
          return { ...basePayload, filters: null };
        }
        return {
          ...basePayload,
          filters: {
            conditions: fileSpecificConditions,
            operator: globalLogicalOperator,
          },
        };
      });

      const groupedByNode = multipleFileFilters.reduce((acc, filterObj) => {
        const nodeId = filterObj.nodeId || "unknown";
        if (!acc[nodeId]) acc[nodeId] = [];
        acc[nodeId].push(filterObj);
        return acc;
      }, {});

      // For each node group, update the axios baseURL and call filterMultipleFiles
      const allPromises = Object.entries(groupedByNode).map(
        async ([nodeId, filtersForNode]) => {
          // Lookup the node (using selectedNodes)
          const node = selectedNodes.find((n) => n.nodeId === nodeId);
          if (node && node.serviceUrl) {
            updateNodeAxiosBaseURL(node.serviceUrl);
          }
          // Call filtering petition for this node
          return filterMultipleFiles({ multipleFileFilters: filtersForNode });
        }
      );

      // Wait for all responses and flatten them
      const responses = await Promise.all(allPromises);
      const newFilteredResults = responses.flat();

      // Now update the dataResults with new responses based on fileName.
      const updatedResults = dataResults.map((oldItem) => {
        const newItem = newFilteredResults.find((fr) => fr.fileName === oldItem.fileName);
        return newItem ? { ...oldItem, ...newItem } : oldItem;
      });


      setDataResults(updatedResults);
      const combined = combineSelectedData(updatedResults, activeFileIndices);
      setDataStatistics(combined);
      setFilteredDataStatistics(combined);

      // If at least one file was filtered, update filters state.
      const hasFilters = multipleFileFilters.some(
        (file) => file.filters && Object.keys(file.filters.conditions).length > 0
      );
      setFilters(hasFilters ? filterConditions : []);
      resetForm();
      closeModal();
    } catch (error) {
      // console.error("Error applying multi-file filters:", error);
      toast.error("Error applying filters: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFilter = () => {
    if (!selectedFeature) {
      setShowTooltip(true);
      return;
    }

    let newCondition = null;
    let createdCategorical = false;
    if (
      dataStatistics?.categoricalFeatures?.some(
        (f) => f.featureName === selectedFeature
      )
    ) {
      const newConditions = selectedCategories.map((category) => ({
        type: "equal",
        value: category,
        filterType: "categorical",
      }));
      addConditionsToFeature(selectedFeature, newConditions);
      setSelectedCategories([]);
      createdCategorical = newConditions.length > 0;
    } else if (
      dataStatistics?.continuousFeatures?.some(
        (f) => f.featureName === selectedFeature
      )
    ) {
      newCondition = {
        type: continuousFilterType,
        value:
          continuousFilterType === "between"
            ? [minValue, maxValue]
            : minValue,
        filterType: "continuous",
      };
    } else if (
      dataStatistics?.dateFeatures?.some(
        (f) => f.featureName === selectedFeature
      )
    ) {
      newCondition = {
        type: dateFilterType,
        value:
          dateFilterType === "between"
            ? [dateRange[0].toISOString(), dateRange[1].toISOString()]
            : dateValue.toISOString(),
        filterType: "date",
      };
    }

    if (newCondition) {
      addConditionsToFeature(selectedFeature, [newCondition]);
      setShowTooltip(false);
    } else if (createdCategorical) {
      setShowTooltip(false);
    } else {
      setShowTooltip(true);
    }
  };

  const addConditionsToFeature = (featureName, newConds) => {
    const newFilterConditions = { ...filterConditions };
    const newLogicalOperators = { ...logicalOperators };

    if (!newFilterConditions[featureName]) {
      newFilterConditions[featureName] = [];
      newLogicalOperators[featureName] = [];
    }
    const existingLength = newFilterConditions[featureName].length;
    newFilterConditions[featureName] = [
      ...newFilterConditions[featureName],
      ...newConds,
    ];

    if (existingLength > 0) {
      newLogicalOperators[featureName] = [
        ...newLogicalOperators[featureName],
        ...new Array(newConds.length).fill("AND"),
      ];
    } else if (newConds.length > 1) {
      newLogicalOperators[featureName] = [
        ...newLogicalOperators[featureName],
        ...new Array(newConds.length - 1).fill("AND"),
      ];
    }
    setFilterConditions(newFilterConditions);
    setLogicalOperators(newLogicalOperators);
  };

  const getCategoryOptions = (featureName) => {
    const feature = dataStatistics?.categoricalFeatures?.find(
      (f) => f.featureName === featureName
    );
    if (!feature) return [];
    const usedCategories = filterConditions[featureName]
      ? filterConditions[featureName].map((c) => c.value)
      : [];
    return Object.keys(feature.categoryCounts)
      .filter((cat) => !usedCategories.includes(cat))
      .map((cat) => ({ value: cat, label: cat }));
  };
  const getGridTemplate = (feature, cType, dType) => {
    if (
      dataStatistics?.categoricalFeatures?.some(
        (f) => f.featureName === feature
      )
    ) {
      return "3fr 1fr"; // categories + button
    } else if (cType === "between" || dType === "between") {
      return "1fr 1fr 1fr 1fr"; // range fields + button
    }
    return "1fr 2fr 1fr";
  };

  const formatSingleCriteria = (condition, featureName) => {
    const isDateFeature = dataStatistics?.dateFeatures?.some(
      (f) => f.featureName === featureName
    );
    const { type, value } = condition;

    if (Array.isArray(value)) {
      if (isDateFeature) {
        return (
          <>
            Between{" "}
            <span className={FilterModalStyles.criteriaBox}>
              {new Date(value[0]).toLocaleDateString()}
            </span>{" "}
            and{" "}
            <span className={FilterModalStyles.criteriaBox}>
              {new Date(value[1]).toLocaleDateString()}
            </span>
          </>
        );
      }
      if (type === "between") {
        return (
          <>
            Between{" "}
            <span className={FilterModalStyles.criteriaBox}>{value[0]}</span>{" "}
            and{" "}
            <span className={FilterModalStyles.criteriaBox}>{value[1]}</span>
          </>
        );
      }
      return (
        <span className={FilterModalStyles.criteriaBox}>
          {value.join(", ")}
        </span>
      );
    } else {
      let displayVal = isDateFeature
        ? new Date(value).toLocaleDateString()
        : value;
      switch (type) {
        case "equal":
          return (
            <>
              Equal to{" "}
              <span className={FilterModalStyles.criteriaBox}>
                {displayVal}
              </span>
            </>
          );
        case "greater":
          return (
            <>
              Greater than{" "}
              <span className={FilterModalStyles.criteriaBox}>
                {displayVal}
              </span>
            </>
          );
        case "less":
          return (
            <>
              Less than{" "}
              <span className={FilterModalStyles.criteriaBox}>
                {displayVal}
              </span>
            </>
          );
        default:
          return (
            <>
              Unknown filter {type} on {displayVal}
            </>
          );
      }
    }
  };

  const toggleLogicalOperator = (featureName, index) => {
    const newOps = { ...logicalOperators };
    newOps[featureName][index] =
      newOps[featureName][index] === "AND" ? "OR" : "AND";
    setLogicalOperators(newOps);
  };

  const handleDeleteFilter = (feature, index) => {
    const newConds = { ...filterConditions };
    const newOps = { ...logicalOperators };
    newConds[feature].splice(index, 1);
    if (newConds[feature].length === 0) {
      delete newConds[feature];
      delete newOps[feature];
    } else {
      newOps[feature].splice(index, 1);
    }
    setFilterConditions(newConds);
    setLogicalOperators(newOps);
  };

  const formatCriteria = (criteria, featureName, ops) => {
    return criteria.map((cond, i) => (
      <div key={i} className={FilterModalStyles.criteriaContainer}>
        {i > 0 && (
          <button
            className={FilterModalStyles.logicalOperatorButton}
            onClick={() => toggleLogicalOperator(featureName, i - 1)}
            disabled={isLoading}
          >
            {ops[i - 1]}
          </button>
        )}
        {formatSingleCriteria(cond, featureName)}
        <button
          className={FilterModalStyles.deleteButton}
          onClick={() => handleDeleteFilter(featureName, i)}
          disabled={isLoading}
        >
          <IoMdClose />
        </button>
      </div>
    ));
  };

  const resetForm = () => {
    setSelectedFeature("");
    setSelectedCategories([]);
    setDateFilterType("equal");
    setDateValue(new Date());
    setDateRange([new Date(), new Date()]);
    setContinuousFilterType("equal");
    setMinValue("");
    setMaxValue("");
  };

  const getOptions = (stats) => {
    if (!stats) return [];
    const opts = [];
    (stats.categoricalFeatures || []).forEach((f) =>
      opts.push({ value: f.featureName, label: f.featureName })
    );
    (stats.continuousFeatures || []).forEach((f) =>
      opts.push({ value: f.featureName, label: f.featureName })
    );
    (stats.dateFeatures || []).forEach((f) =>
      opts.push({ value: f.featureName, label: f.featureName })
    );
    return opts;
  };

  const isAddFilterDisabled = () => {
    if (!selectedFeature) return true;
    if (
      dataStatistics?.categoricalFeatures?.some(
        (f) => f.featureName === selectedFeature
      )
    )
      return selectedCategories.length === 0;
    if (
      dataStatistics?.continuousFeatures?.some(
        (f) => f.featureName === selectedFeature
      )
    ) {
      if (continuousFilterType === "between") return !minValue || !maxValue;
      return !minValue;
    }
    if (
      dataStatistics?.dateFeatures?.some(
        (f) => f.featureName === selectedFeature
      )
    ) {
      if (dateFilterType === "between") return !dateRange[0] || !dateRange[1];
      return !dateValue;
    }
    return false;
  };

  const hasAtLeastTwoFilters = () => {
    return (
      Object.values(filterConditions).filter(
        (arr) => arr && arr.length > 0
      ).length > 1
    );
  };

  if (!dataStatistics) return null;

  return (
    <OverlayWrapper isOpen={isOpen} closeModal={closeModal}>
      <div className={FilterModalStyles.filterModal} role="dialog" aria-modal="true" aria-labelledby="filter-modal-title">
        <div className={FilterModalStyles.modalHeader}>
          <h3 id="filter-modal-title">Filter displayed data</h3>
          <button
            className={FilterModalStyles.closeBtn}
            onClick={closeModal}
            aria-label="Close filter modal"
            disabled={isLoading}
          >
            <IoMdClose />
          </button>
        </div>
        <div
          className={
            selectedFeature
              ? FilterModalStyles.formRow
              : FilterModalStyles.centeredRow
          }
        >
          <div className={FilterModalStyles.featureSelection}>
            <Select
              options={getOptions(dataStatistics)}
              onChange={(option) => setSelectedFeature(option.value)}
              value={getOptions(dataStatistics).find(
                (o) => o.value === selectedFeature
              )}
              isDisabled={isLoading}
              aria-label="Select feature to filter"
              inputId="feature-select"
            />
            {hasAtLeastTwoFilters() && (
              <div className={FilterModalStyles.globalLogicalOperatorContainer}>
                <label>Combine all filters with</label>
                <button
                  className={FilterModalStyles.logicalOperatorButton}
                  onClick={() =>
                    setGlobalLogicalOperator(
                      globalLogicalOperator === "AND" ? "OR" : "AND"
                    )
                  }
                  disabled={isLoading}
                  aria-label={`Global logical operator: ${globalLogicalOperator}. Click to toggle.`}
                >
                  {globalLogicalOperator}
                </button>
              </div>
            )}
          </div>

          {selectedFeature && (
            <div
              className={FilterModalStyles.filterCriteria}
              style={{
                gridTemplateColumns: getGridTemplate(
                  selectedFeature,
                  continuousFilterType,
                  dateFilterType
                ),
              }}
            >
              {dataStatistics?.categoricalFeatures?.some(
                (f) => f.featureName === selectedFeature
              ) && (
                  <div>
                    <label>Choose categories:</label>
                    <Select
                      isMulti
                      options={getCategoryOptions(selectedFeature)}
                      onChange={(vals) =>
                        setSelectedCategories(vals.map((v) => v.value))
                      }
                      value={getCategoryOptions(selectedFeature).filter((opt) =>
                        selectedCategories.includes(opt.value)
                      )}
                      isDisabled={isLoading}
                    />
                  </div>
                )}

              {dataStatistics?.continuousFeatures?.some(
                (f) => f.featureName === selectedFeature
              ) && (
                  <>
                    <div>
                      <label htmlFor="continuous-filter-type">Filter Type</label>
                      <select
                        id="continuous-filter-type"
                        data-testid="continuous-filter-type"
                        className={FilterModalStyles.select}
                        onChange={(e) => setContinuousFilterType(e.target.value)}
                        value={continuousFilterType}
                        disabled={isLoading}
                      >
                        <option value="equal">Equal</option>
                        <option value="between">Between</option>
                        <option value="less">Less than</option>
                        <option value="greater">Greater than</option>
                      </select>
                    </div>
                    {continuousFilterType === "between" ? (
                      <>
                        <div>
                          <label htmlFor="min-value">Min Value</label>
                          <input
                            id="min-value"
                            data-testid="min-value-input"
                            type="number"
                            className={FilterModalStyles.input}
                            onChange={(e) => setMinValue(e.target.value)}
                            value={minValue}
                            disabled={isLoading}
                          />
                        </div>
                        <div>
                          <label htmlFor="max-value">Max Value</label>
                          <input
                            id="max-value"
                            data-testid="max-value-input"
                            type="number"
                            className={FilterModalStyles.input}
                            onChange={(e) => setMaxValue(e.target.value)}
                            value={maxValue}
                            disabled={isLoading}
                          />
                        </div>
                      </>
                    ) : (
                      <div>
                        <label>Value</label>
                        <input
                          type="number"
                          className={FilterModalStyles.input}
                          onChange={(e) => setMinValue(e.target.value)}
                          value={minValue}
                          disabled={isLoading}
                        />
                      </div>
                    )}
                  </>
                )}
              {dataStatistics?.dateFeatures?.some(
                (f) => f.featureName === selectedFeature
              ) && (
                  <>
                    <div>
                      <label htmlFor="date-filter-type">Filter Type</label>
                      <select
                        id="date-filter-type"
                        data-testid="date-filter-type"
                        className={FilterModalStyles.select}
                        onChange={(e) => setDateFilterType(e.target.value)}
                        value={dateFilterType}
                        disabled={isLoading}
                      >
                        <option value="equal">Equal</option>
                        <option value="between">Between</option>
                        <option value="less">Sooner than</option>
                        <option value="greater">Later than</option>
                      </select>
                    </div>
                    {dateFilterType === "between" ? (
                      <>
                        <div>
                          <label>Start Date</label>
                          <DatePicker
                            selected={dateRange[0]}
                            onChange={(date) =>
                              setDateRange([date, dateRange[1]])
                            }
                            className={FilterModalStyles.datePicker}
                            disabled={isLoading}
                          />
                        </div>
                        <div>
                          <label>End Date</label>
                          <DatePicker
                            selected={dateRange[1]}
                            onChange={(date) =>
                              setDateRange([dateRange[0], date])
                            }
                            className={FilterModalStyles.datePicker}
                            disabled={isLoading}
                          />
                        </div>
                      </>
                    ) : (
                      <div>
                        <label>Date</label>
                        <DatePicker
                          selected={dateValue}
                          onChange={(date) => setDateValue(date)}
                          className={FilterModalStyles.datePicker}
                          disabled={isLoading}
                        />
                      </div>
                    )}
                  </>
                )}

              <button
                className={FilterModalStyles.addButton}
                onClick={() => {
                  if (isAddFilterDisabled()) {
                    setShowTooltip(true);
                  } else {
                    handleAddFilter();
                  }
                }}
                ref={addButtonRef}
                disabled={isAddFilterDisabled() || isLoading}
              >
                {filterConditions[selectedFeature] &&
                  filterConditions[selectedFeature].length > 0
                  ? "Add More Criteria"
                  : "Add Filter"}
              </button>
              {showTooltip && (
                <TooltipPopup
                  message={"Please fill in all fields"}
                  buttonRef={addButtonRef}
                  onClose={() => setShowTooltip(false)}
                />
              )}
            </div>
          )}
        </div>

        {Object.keys(filterConditions).some((k) => filterConditions[k]) && (
          <div className={FilterModalStyles.filterSummary}>
            <TransitionGroup component="ul">
              {Object.entries(filterConditions).map(([feat, conds]) => {
                if (!conds || conds.length === 0) return null;
                return (
                  <CSSTransition
                    key={feat}
                    timeout={500}
                    classNames={{
                      enter: FilterModalStyles.itemEnter,
                      enterActive: FilterModalStyles.itemEnterActive,
                      exit: FilterModalStyles.itemExit,
                      exitActive: FilterModalStyles.itemExitActive,
                    }}
                  >
                    <li
                      style={{
                        display: "flex",
                        width: "100%",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div className={FilterModalStyles.filterSummaryTitle}>
                        <strong>{feat}</strong>
                      </div>
                      <div className={FilterModalStyles.criteriaRow}>
                        {formatCriteria(
                          conds,
                          feat,
                          logicalOperators[feat] || []
                        )}
                      </div>
                    </li>
                  </CSSTransition>
                );
              })}
            </TransitionGroup>
          </div>
        )}

        <div className={FilterModalStyles.buttonRow}>
          <button
            className={FilterModalStyles.cancelButton}
            onClick={closeModal}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className={FilterModalStyles.applyButton}
            onClick={handleApplyFilters}
            disabled={
              isLoading ||
              (Object.keys(filterConditions).every(
                (key) =>
                  !filterConditions[key] || filterConditions[key].length === 0
              ) &&
                Object.keys(filters).length === 0)
            }
          >
            {isLoading ? (
              <>
                <span className={FilterModalStyles.spinner}></span>
                Applying Filters...
              </>
            ) : Object.keys(filterConditions).every(
              (key) =>
                !filterConditions[key] || filterConditions[key].length === 0
            )
              ? Object.keys(filters).length > 0
                ? "Reset Previous Filters"
                : "No Filters Set"
              : "Apply Filters"}
          </button>
        </div>
      </div>
    </OverlayWrapper>
  );
}

export default FilterModal;
