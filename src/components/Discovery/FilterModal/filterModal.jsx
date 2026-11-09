import React, { useState, useEffect } from "react";
import OverlayWrapper from "../../Common/OverlayWrapper/overlayWrapper";
import Select from "react-select";
import Switch from "react-switch";
import FilterModalStyles from "./filterModal.module.css";
import { IoMdClose } from "react-icons/io";
import { toast } from "react-toastify";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { filterDiscoveryDatasets } from "../CombinedStatistics/filterDiscoveryDatasets";
import { filterFeatures, matchingFilterFeatures, fileFilterConditions } from "./filterFeatures";
import FilterCriteriaEditor from "./filterCriteriaEditor";
import { useNode } from "../../../context/nodeContext";

const emptySelection = [];

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
const FilterModal = ({ refreshControllerRef, isOpen, dataStatistics, closeModal, filters, setFilters, dataResults, setDataResults, onFiltered, onFilteringChange, filterLogic, setFilterLogic, columnMappings = [], selectedEntries = emptySelection }) => {
  const [filterConditions, setFilterConditions] = useState({});
  const [logicalOperators, setLogicalOperators] = useState({});
  const [globalLogicalOperator, setGlobalLogicalOperator] = useState("AND");
  const [matchColumns, setMatchColumns] = useState(true);

  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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
    const available = new Set(filterFeatures(availableStatistics).map(feature => feature.featureName));
    setSelectedFeatures(selectedEntries.map(entry => entry.featureName).filter(name => available.has(name)));
  }, [isOpen, availableStatistics, filters, filterLogic, selectedEntries]);

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

      closeModal();
    } catch (error) {
      // console.error("Error applying multi-file filters:", error);
      toast.error("Error applying filters: " + error.message);
    } finally {
      setIsLoading(false);
      onFilteringChange?.(false);
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
        <div className={FilterModalStyles.filterBody}>
        <div
          className={selectedFeatures.length ? FilterModalStyles.formRow : FilterModalStyles.centeredRow}
        >
          <div className={FilterModalStyles.featureSelection}>
            <Select
              isMulti
              closeMenuOnSelect={false}
              classNamePrefix="react-select"
              options={getOptions(availableStatistics)}
              onChange={options => setSelectedFeatures((options || []).map(option => option.value))}
              value={getOptions(availableStatistics).filter(option => selectedFeatures.includes(option.value))}
              isDisabled={isLoading}
              aria-label="Select feature to filter"
              inputId="feature-select"
            />
            {dataResults.length > 1 && (
              <label className={FilterModalStyles.matchColumns} title="Copies criteria using saved feature combinations, or matching names and types when no combination exists. Includes loaded datasets currently hidden.">
                <span>Apply to matching columns in other datasets</span>
                <Switch checked={matchColumns} onChange={setMatchColumns} disabled={isLoading}
                  aria-label="Apply to matching columns in other datasets"
                  height={16} width={32} handleDiameter={12} offColor="#888" onColor="#9ABDDC" />
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


        <div className={FilterModalStyles.featureEditors}>
          {selectedFeatures.map(name => <FilterCriteriaEditor key={name} selectedFeature={name}
            showHeading={selectedFeatures.length > 1}
            availableStatistics={availableStatistics} filterConditions={filterConditions}
            matchColumns={matchColumns} columnMappings={columnMappings} isLoading={isLoading}
            onAddConditions={addConditionsToFeature} />)}
        </div>
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

        </div>
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
