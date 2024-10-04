import React, { useState, useEffect, useRef } from "react";
import AggregateDisplayStyles from "./aggregateDisplay.module.css";

const AggregateDisplay = ({
  covariances,
  pearsonCorrelations,
  spearmanCorrelations,
  chiSquareTest,
  omittedFeatures,
}) => {
  const [activeTab, setActiveTab] = useState("covariance");
  const selectRef = useRef(null);
  const matrixRef = useRef(null);

  useEffect(() => {
    const updateSelectWidth = () => {
      if (matrixRef.current && selectRef.current) {
        const firstHeaderCell = matrixRef.current.querySelector("th");
        if (firstHeaderCell)
          selectRef.current.style.width = `${firstHeaderCell.offsetWidth}px`;
      }
    };
    updateSelectWidth();
    window.addEventListener("resize", updateSelectWidth);
    return () => window.removeEventListener("resize", updateSelectWidth);
  }, [covariances]);

  const isStatsEmpty = (stats) => {
    const keys = Object.keys(stats);
    if (keys.length === 0) return true;
    return keys.every((rowKey) =>
      Object.values(stats[rowKey]).every((value) => value === undefined)
    );
  };

  const renderMatrix = (stats) => {
    if (isStatsEmpty(stats))
      return (
        <div className={AggregateDisplayStyles.noData}>
          No aggregate data available
        </div>
      );

    const keys = Object.keys(stats).sort();
    return (
      <table ref={matrixRef} className={AggregateDisplayStyles.matrix}>
        <thead>
          <tr>
            <th className={AggregateDisplayStyles.matrixCorner}></th>
            {keys.map((key) => (
              <th key={key} className={AggregateDisplayStyles.matrixHeader}>
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keys.map((rowKey) => (
            <tr key={rowKey}>
              <td className={AggregateDisplayStyles.matrixHeader}>{rowKey}</td>
              {keys.map((columnKey) => (
                <td
                  key={columnKey}
                  className={`${AggregateDisplayStyles.matrixCell} ${
                    rowKey === columnKey ? AggregateDisplayStyles.diagonal : ""
                  }`}
                >
                  {stats[rowKey] && stats[rowKey][columnKey] !== undefined
                    ? stats[rowKey][columnKey].toFixed(2)
                    : "N/A"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const tabContent = {
    covariance: renderMatrix(covariances),
    pearson: renderMatrix(pearsonCorrelations),
    spearman: renderMatrix(spearmanCorrelations),
  };

  const renderChiSquaredResults = () => {
    if (chiSquareTest.length === 0)
      return (
        <div className={AggregateDisplayStyles.noData}>
          No Chi-Squared Tests available
        </div>
      );

    return (
      <div className={AggregateDisplayStyles.chiSquaredResultsContainer}>
        {chiSquareTest &&
          chiSquareTest.map((test, index) => (
            <div key={index}>
              <strong>{`${test.category1} vs ${test.category2}`}: </strong>
              {typeof test.pvalue === "number" ? test.pvalue.toFixed(4) : "N/A"}
            </div>
          ))}
      </div>
    );
  };

  const renderOmittedFeatures = () => {
    if (omittedFeatures.length === 0)
      return (
        <div className={AggregateDisplayStyles.noData}>
          No fields were omitted
        </div>
      );

    return (
      <div className={AggregateDisplayStyles.omittedFeaturesContainer}>
        {omittedFeatures.map((feature, index) => (
          <div key={index}>
            <strong>{feature.featureName}: </strong>
            {feature.reason} (Missing: {feature.percentMissing.toFixed(2)}%)
          </div>
        ))}
      </div>
    );
  };

  const isEmpty =
    isStatsEmpty(covariances) &&
    isStatsEmpty(pearsonCorrelations) &&
    isStatsEmpty(spearmanCorrelations);

  return (
    <div className={AggregateDisplayStyles.statsContainer}>
      {!isEmpty && (
        <>
          <div className={AggregateDisplayStyles.statsBlock}>
            <select
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
            {tabContent[activeTab]}
          </div>
          <div className={AggregateDisplayStyles.omittedChiContainer}>
            <div className={AggregateDisplayStyles.chiSquaredResults}>
              {renderChiSquaredResults()}
            </div>
            <div className={AggregateDisplayStyles.omittedResults}>
              {renderOmittedFeatures()}
            </div>
          </div>
        </>
      )}
      {isEmpty && (
        <div className={AggregateDisplayStyles.noData}>
          No aggregated data available
        </div>
      )}
    </div>
  );
};

export default AggregateDisplay;
