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
import { filterDiscoveryDatasets } from "../CombinedStatistics/filterDiscoveryDatasets";
import { filterFeatures, matchingFilterFeatures, fileFilterConditions } from "./filterFeatures";
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
const FilterModal = ({ refreshControllerRef, isOpen, dataStatistics, closeModal, filters, setFilters, dataResults, setDataResults, onFiltered, onFilteringChange, filterLogic, setFilterLogic, columnMappings = [] }) => {
  const [filterConditions, setFilterConditions] = useState({});
  const [logicalOperators, setLogicalOperators] = useState({});
  const [globalLogicalOperator, setGlobalLogicalOperator] = useState("AND");
  const [matchColumns, setMatchColumns] = useState(true);

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

  const availableStatistics = dataStatistics;

  // Reopening the existing dialog restores the applied criteria, including AND/OR choices.
  useEffect(() => {
    if (!isOpen || !availableStatistics) return;
    const applied = Object.fromEntries(Object.entries(filters || {}).filter(([, value]) => Array.isArray(value))
      .map(([name, value]) => [name, value.map(condition => ({ ...condition }))]));
    setFilterConditions({ ...initializeFilters(availableStatistics), ...applied });
    setLogicalOperators(filterLogic?.operators || Object.fromEntries(Object.entries(applied).map(([name, value]) => [name, new Array(Math.max(0, value.length - 1)).fill("AND")])));
    setGlobalLogicalOperator(filterLogic?.operator || "AND");
    setMatchColumns(filterLogic?.matchColumns ?? true);
  }, [isOpen, availableStatistics, filters, filterLogic]);

  const handleApplyFilters = async () => {
    setIsLoading(true);
    onFilteringChange?.(true);
    try {
      const updatedResults = await filterDiscoveryDatasets(dataResults, selectedNodes, source => {
        const conditions = fileFilterConditions(availableStatistics, filterConditions, logicalOperators, source, dataResults.length, matchColumns, columnMappings);
        return Object.keys(conditions).length ? { conditions, operator: globalLogicalOperator } : null;
      }, ...(refreshControllerRef?.current ? [{signal: refreshControllerRef.current.signal}] : []));

      setDataResults(updatedResults);
      onFiltered?.();

      // If at least one file was filtered, update filters state.
      const hasFilters = Object.values(filterConditions).some(criteria => criteria?.length);
      setFilters(hasFilters ? filterConditions : []);
      setFilterLogic?.({ operators: hasFilters ? logicalOperators : {}, operator: hasFilters ? globalLogicalOperator : "AND", matchColumns });
      resetForm();
      closeModal();
    } catch (error) {
      // console.error("Error applying multi-file filters:", error);
      toast.error("Error applying filters: " + error.message);
    } finally {
      setIsLoading(false);
      onFilteringChange?.(false);
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
      availableStatistics?.categoricalFeatures?.some(
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
      availableStatistics?.continuousFeatures?.some(
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
      availableStatistics?.dateFeatures?.some(
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
    const entries = filterFeatures(availableStatistics);
    const entry = entries.find(feature => feature.featureName === featureName);
    // Matching columns share one criteria group, including its AND/OR operators.
    const existing = matchColumns && matchingFilterFeatures(availableStatistics, entry, columnMappings).find(other => filterConditions[other.featureName]?.length);
    if (existing) featureName = existing.featureName;
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
    const feature = availableStatistics?.categoricalFeatures?.find(
      (f) => f.featureName === featureName
    );
    if (!feature) return [];
    const usedCategories = filterConditions[featureName]
      ? filterConditions[featureName].map((c) => c.value)
      : [];
    const members = matchColumns ? matchingFilterFeatures(availableStatistics, feature, columnMappings) : [feature];
    return [...new Set(members.flatMap(member => Object.keys(member.categoryCounts || {})))]
      .filter((cat) => !usedCategories.includes(cat))
      .map((cat) => ({ value: cat, label: cat }));
  };
  const getGridTemplate = (feature, cType, dType) => {
    if (
      availableStatistics?.categoricalFeatures?.some(
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
    const isDateFeature = availableStatistics?.dateFeatures?.some(
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
    const newOps = { ...logicalOperators, [featureName]: [...logicalOperators[featureName]] };
    newOps[featureName][index] =
      newOps[featureName][index] === "AND" ? "OR" : "AND";
    setLogicalOperators(newOps);
  };

  const handleDeleteFilter = (feature, index) => {
    const newConds = { ...filterConditions };
    const newOps = { ...logicalOperators };
    newConds[feature] = newConds[feature].filter((_, i) => i !== index);
    if (newConds[feature].length === 0) {
      delete newConds[feature];
      delete newOps[feature];
    } else {
      newOps[feature] = (newOps[feature] || []).filter((_, i) => i !== Math.max(0, index - 1));
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
          aria-label={`Remove criterion ${i + 1} for ${featureName}`}
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
      availableStatistics?.categoricalFeatures?.some(
        (f) => f.featureName === selectedFeature
      )
    )
      return selectedCategories.length === 0;
    if (
      availableStatistics?.continuousFeatures?.some(
        (f) => f.featureName === selectedFeature
      )
    ) {
      if (continuousFilterType === "between") return !minValue || !maxValue;
      return !minValue;
    }
    if (
      availableStatistics?.dateFeatures?.some(
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

  if (!availableStatistics) return null;

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
            classNamePrefix="react-select"
              options={getOptions(availableStatistics)}
              onChange={(option) => setSelectedFeature(option.value)}
              value={getOptions(availableStatistics).find(
                (o) => o.value === selectedFeature
              )}
              isDisabled={isLoading}
              aria-label="Select feature to filter"
              inputId="feature-select"
            />
            {dataResults.length > 1 && (
              <label className={FilterModalStyles.matchColumns} title="Copies criteria using saved feature combinations, or matching names and types when no combination exists. Includes loaded datasets currently hidden.">
                <input type="checkbox" checked={matchColumns} onChange={event => setMatchColumns(event.target.checked)} disabled={isLoading} />
                Apply to matching columns in other datasets
              </label>
            )}
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
              {availableStatistics?.categoricalFeatures?.some(
                (f) => f.featureName === selectedFeature
              ) && (
                  <div>
                    <label>Choose categories:</label>
                    <Select
                      isMulti
                      classNamePrefix="react-select"
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

              {availableStatistics?.continuousFeatures?.some(
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
                        <label htmlFor="continuous-value">Value</label>
                        <input
                          id="continuous-value"
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
              {availableStatistics?.dateFeatures?.some(
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
                        {matchColumns && (() => {
                          const feature = filterFeatures(availableStatistics).find(item => item.featureName === feat);
                          const count = feature ? matchingFilterFeatures(availableStatistics, feature, columnMappings).length : 0;
                          return count > 1 ? <small className={FilterModalStyles.matchCount}>{count} matching columns</small> : null;
                        })()}
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

export default React.memo(FilterModal);
