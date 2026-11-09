import React, { useState, useEffect, useRef, useCallback } from "react";
import AggregateDisplayStyles from "./aggregateDisplay.module.css";
import FilterIndicator from "../FilterModal/filterIndicator";
import { relationshipConventions } from "../discoveryStatistics";

// Display for all aggregate statistics
const AggregateDisplay = ({ covariances = {}, pearsonCorrelations = {}, spearmanCorrelations = {}, chiSquareTest = [], omittedFeatures = [], featureFilters = {}, relationshipDetails }) => {

  const [activeTab, setActiveTab] = useState("covariance");
  const [topHeight, setTopHeight] = useState(300);

  const selectRef = useRef(null);
  const matrixRef = useRef(null);
  const draggingRef = useRef(false);

  const onMouseDown = useCallback((e) => {
    draggingRef.current = true;
    e.preventDefault();
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!draggingRef.current) return;
    e.preventDefault();
    const newHeight = e.clientY - 55;
    setTopHeight(Math.max(newHeight, 50));
  }, []);

  const onMouseUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  useEffect(() => {
    const updateSelectWidth = () => {
      if (!matrixRef.current || !selectRef.current) return;
    
      const firstHeaderCell = matrixRef.current.querySelector("th");
      if (!firstHeaderCell) return;
      const rect = firstHeaderCell.getBoundingClientRect();
      selectRef.current.style.width = `${Math.ceil(rect.width)}px`;
      selectRef.current.style.height = `${Math.ceil(rect.height)}px`;
    };
    
    updateSelectWidth();
    window.addEventListener("resize", updateSelectWidth);
    return () => window.removeEventListener("resize", updateSelectWidth);
  }, [covariances]);

  function isStatsEmpty(stats) {
    if (!stats || Object.keys(stats).length === 0) return true;
    return Object.keys(stats).every((rowKey) =>
      Object.values(stats[rowKey]).every((val) => !Number.isFinite(val))
    );
  }

  function renderMatrix(stats) {
    if (!stats || isStatsEmpty(stats) && !Object.keys(relationshipDetails?.[activeTab] || {}).length) {
      return (
        <div className={AggregateDisplayStyles.noData}>
          No aggregate data available
        </div>
      );
    }
    const keys = Object.keys(stats).sort();
    return (
      <table ref={matrixRef} className={AggregateDisplayStyles.matrix} aria-label={`${activeTab} relationships`}>
        <thead>
          <tr>
            <th className={AggregateDisplayStyles.matrixCorner}></th>
            {keys.map((key) => (
              <th key={key} className={AggregateDisplayStyles.matrixHeader}>
                {key}<FilterIndicator description={featureFilters[key]} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keys.map((rowKey) => (
            <tr key={rowKey}>
              <td className={AggregateDisplayStyles.matrixHeader}>{rowKey}<FilterIndicator description={featureFilters[rowKey]} /></td>
              {keys.map((columnKey) => {
                const detail = relationshipDetails?.[activeTab]?.[rowKey]?.[columnKey];
                const value =
                  Number.isFinite(stats[rowKey]?.[columnKey])
                    ? stats[rowKey][columnKey]
                    : null;
                return (
                  <td
                    title={detail ? [detail.reason, detail.count != null ? `${detail.count} paired observations` : null, detail.datasets?.join("; ")].filter(Boolean).join(" · ") : undefined}
                    key={columnKey}
                    className={`${AggregateDisplayStyles.matrixCell} ${rowKey === columnKey ? AggregateDisplayStyles.diagonal : ""
                      }`}
                  >
                    {value !== null ? (Math.abs(value) < .005 ? 0 : value).toFixed(2) : "N/A"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const tabContent = {
    covariance: () => renderMatrix(covariances),
    pearson: () => renderMatrix(pearsonCorrelations),
    spearman: () => renderMatrix(spearmanCorrelations),
  };

  function renderChiSquaredResults() {
    if (!chiSquareTest || chiSquareTest.length === 0) {
      return (
        <div className={AggregateDisplayStyles.noData}>
          No Chi-Squared Tests available
        </div>
      );
    }
    return (
      <div className={AggregateDisplayStyles.chiSquaredResultsContainer}>
        {chiSquareTest.map((test, i) => (
          <div key={i} title={[relationshipConventions.chiSquarePValue, test.reason, test.count != null ? `${test.count} paired observations` : null, test.datasets?.join("; ")].filter(Boolean).join(" · ")}>
            <strong>{`${test.category1} vs ${test.category2}: `}</strong>
            {Number.isFinite(test.pvalue) ? test.pvalue === 0 ? "< 1e-308" : test.pvalue < .0001 ? test.pvalue.toExponential(2) : test.pvalue.toFixed(4) : "N/A"}
          </div>
        ))}
      </div>
    );
  }

  function renderOmittedFeatures() {
    if (!omittedFeatures || omittedFeatures.length === 0) {
      return (
        <div className={AggregateDisplayStyles.noData}>
          No fields were omitted
        </div>
      );
    }
    return (
      <div className={AggregateDisplayStyles.omittedFeaturesContainer}>
        {omittedFeatures.map((feature, i) => (
          <div key={i}>
            <strong>{feature.featureName}: </strong>
            {feature.reason}
            {!feature.reason?.startsWith("Suppressed for privacy:") &&
              Number.isFinite(feature.percentMissing) && ` (Missing: ${feature.percentMissing.toFixed(2)}%)`}
          </div>
        ))}
      </div>
    );
  }

  const isEmpty =
    isStatsEmpty(covariances) &&
    isStatsEmpty(pearsonCorrelations) &&
    isStatsEmpty(spearmanCorrelations);

  if (isEmpty && !chiSquareTest.length && !omittedFeatures.length && !relationshipDetails) {
    return (
      <div className={AggregateDisplayStyles.statsContainer}>
        <div className={AggregateDisplayStyles.noData}>
          No aggregated data available
        </div>
      </div>
    );
  }

  return (
    <div className={AggregateDisplayStyles.statsContainer}>
      <div
        className={AggregateDisplayStyles.topPanel}
        data-testid="top-panel"
        style={{ height: `${topHeight}px` }}
      >
        <div className={AggregateDisplayStyles.statsBlock}>
          <select
            aria-label="Relationship statistic"
            title={relationshipConventions[{covariance:"covariances", pearson:"pearsonCorrelations", spearman:"spearmanCorrelations"}[activeTab]]}
            ref={selectRef}
            className={`${AggregateDisplayStyles.statsTitle} ${AggregateDisplayStyles.selectPosition}`}
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
          >
            {Object.keys(tabContent).map((tabKey) => (
              <option key={tabKey} value={tabKey}>
                {tabKey.charAt(0).toUpperCase() + tabKey.slice(1)}
              </option>
            ))}
          </select>
          {tabContent[activeTab]()}
        </div>
      </div>

      <div
        className={AggregateDisplayStyles.splitter}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize panels"
        onMouseDown={onMouseDown}
      />

      <div className={AggregateDisplayStyles.bottomPanel}>
        <div className={AggregateDisplayStyles.omittedChiContainer}>
          <div className={AggregateDisplayStyles.chiSquaredResults}>
            {renderChiSquaredResults()}
          </div>
          <div className={AggregateDisplayStyles.omittedResults}>
            {renderOmittedFeatures()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AggregateDisplay;
