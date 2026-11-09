import React, { useState, useMemo, useCallback } from "react";
import ContinuousChart from "../ContinuousChart/continuousChart";
import CategoricalChart from "../CategoricalChart/categoricalChart";
import DateChart from "../DateChart/dateChart";
import EntrySearch from "../EntrySearch/entrySearch";
import StatisticsDisplayStyles from "./statisticsDisplay.module.css";
import ChartPreview from "../ChartPreview/chartPreview";
import { sourceLabel } from "../CombinedStatistics/combinedStatistics";
import { sourceFilter } from "../FilterModal/appliedFilters";
import { formatCategoryPercent } from "../discoveryStatistics";

const ContinuousOverviewChart = React.memo(function ContinuousOverviewChart({
  feature,
  showOutliers,
  isSelected,
  onSelect,
  onPreview,
  filterDescription,
}) {
  const handleClick = useCallback(() => {
    onSelect({ type: "continuous", featureName: feature.featureName });
  }, [feature.featureName, onSelect]);
  const handleDoubleClick = useCallback(() => {
    onPreview("continuous", feature, showOutliers);
  }, [feature, onPreview, showOutliers]);

  return (
    <ContinuousChart
      feature={feature}
      showOutliers={showOutliers}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      isSelected={isSelected}
      inOverview
      filterDescription={filterDescription}
    />
  );
});

const CategoricalOverviewChart = React.memo(function CategoricalOverviewChart({
  feature,
  isSelected,
  onSelect,
  onPreview,
  filterDescription,
}) {
  const handleClick = useCallback(() => {
    onSelect({ type: "categorical", featureName: feature.featureName });
  }, [feature.featureName, onSelect]);
  const handleDoubleClick = useCallback(() => {
    onPreview("categorical", feature, false);
  }, [feature, onPreview]);

  return (
    <CategoricalChart
      feature={feature}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      isSelected={isSelected}
      inOverview
      filterDescription={filterDescription}
    />
  );
});

const DateOverviewChart = React.memo(function DateOverviewChart({
  feature,
  showOutliers,
  isSelected,
  onSelect,
  onPreview,
  filterDescription,
}) {
  const handleClick = useCallback(() => {
    onSelect({ type: "continuous", featureName: feature.featureName });
  }, [feature.featureName, onSelect]);
  const handleDoubleClick = useCallback(() => {
    onPreview("date", feature, showOutliers);
  }, [feature, onPreview, showOutliers]);

  return (
    <DateChart
      dateData={feature}
      dateDataKey={feature.featureName}
      showOutliers={showOutliers}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      isSelected={isSelected}
      filterDescription={filterDescription}
    />
  );
});

// Display for individual statistics, contains tables and graphs
const StatisticsDisplay = React.memo(
  ({ data, tableData = data, numericalTableActions, categoricalTableActions, combinedTables = false, showOutliers, setSelectedEntry, selectedEntry, featureFilters, appliedFilters }) => {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewContent, setPreviewContent] = useState(null);
    const rowTitles = useMemo(() => Object.fromEntries(["continuousFeatures", "categoricalFeatures", "dateFeatures"].flatMap(key => (tableData[key] || [])
      .filter(feature => feature.pooled).map(feature => [feature.featureName, feature.combinedSummary.contributions.map(contribution => `${sourceLabel(contribution.source)} / ${contribution.columnName || contribution.feature?.featureName || feature.featureName}`).join(" ↔ ")]))), [tableData]);

    const formatMissingEntries = useCallback((count, missingValuesCount) => {
      if (count == null || missingValuesCount == null) return "N/A";
      const missingPercentage = ((missingValuesCount / (count + missingValuesCount)) * 100).toFixed(2);
      return missingValuesCount === 0
        ? "0 (0%)"
        : `${missingValuesCount} (${missingPercentage}%)`;
    }, []);

    const sortedContinuousFeatures = useMemo(() =>
      [...(data.continuousFeatures || [])].sort((a, b) => a.count - b.count),
      [data.continuousFeatures]
    );

    const sortedCategoricalFeatures = useMemo(() =>
      [...(data.categoricalFeatures || [])].sort((a, b) => a.count - b.count),
      [data.categoricalFeatures]
    );

    const sortedDateFeatures = useMemo(() =>
      [...(data.dateFeatures || [])].sort((a, b) => a.count - b.count),
      [data.dateFeatures]
    );

    const continuousDataForTable = useMemo(() => {
      const table = {
        Name: [],
        Count: [],
        Mean: [],
        "Std. Dev.": [],
        Min: [],
        "1st Qrt.": [],
        Median: [],
        "3rd Qrt.": [],
        Max: [],
        "Missing Entries": [],
      };
      if (combinedTables) table.Datasets = [];
      tableData.continuousFeatures.forEach((feature) => {
        table.Name.push(feature.featureName);
        table["Count"].push(feature.count?.toString() ?? "N/A");
        table["Mean"].push(feature.mean?.toFixed(2) ?? "N/A");
        table["Std. Dev."].push(feature.stdDev?.toFixed(2) ?? "N/A");
        table["Min"].push(feature.min?.toString() ?? "N/A");
        table["1st Qrt."].push(feature.qrt1?.toFixed(2) ?? "N/A");
        table["Median"].push(feature.median?.toFixed(2) ?? "N/A");
        table["3rd Qrt."].push(feature.qrt3?.toFixed(2) ?? "N/A");
        table["Max"].push(feature.max?.toString() ?? "N/A");
        table["Missing Entries"].push(
          formatMissingEntries(feature.count, feature.missingValuesCount)
        );
        if (combinedTables) table.Datasets.push(feature.datasetCount || "1");
      });
      if (tableData.dateFeatures && tableData.dateFeatures.length > 0) {
        tableData.dateFeatures.forEach((dateStat) => {
          table.Name.push(dateStat.featureName);
          table["Count"].push(dateStat.count?.toString() ?? "N/A");
          table["Mean"].push(dateStat.mean ?? "N/A");
          table["Std. Dev."].push(
            dateStat.stdDev?.toFixed(2) ?? "N/A"
          );
          table["Min"].push(dateStat.earliestDate || "N/A");
          table["1st Qrt."].push(dateStat.q1 || "N/A");
          table["Median"].push(dateStat.median || "N/A");
          table["3rd Qrt."].push(dateStat.q3 || "N/A");
          table["Max"].push(dateStat.latestDate || "N/A");
          table["Missing Entries"].push(
            formatMissingEntries(dateStat.count, dateStat.missingValuesCount)
          );
          if (combinedTables) table.Datasets.push(dateStat.datasetCount || "1");
        });
      }
      if (combinedTables) table.Status = [...tableData.continuousFeatures, ...(tableData.dateFeatures || [])].map(feature => feature.status || "Individual dataset");
      return table;
    }, [tableData, combinedTables, formatMissingEntries]);

    const categoricalDataForTable = useMemo(() => {
      const table = {
        Name: tableData.categoricalFeatures.map((f) => f.featureName),
        "Total Count": tableData.categoricalFeatures.map((f) =>
          f.count?.toString() ?? "N/A"
        ),
        Mode: tableData.categoricalFeatures.map((f) => f.mode ?? "N/A"),
        "Mode Frequency": tableData.categoricalFeatures.map((f) =>
          f.modeFrequency?.toString() ?? "N/A"
        ),
        "Mode %": tableData.categoricalFeatures.map((f) =>
          formatCategoryPercent(f.modeFrequency, f.count)
        ),
        "2nd Mode": tableData.categoricalFeatures.map((f) => f.secondMode ?? "N/A"),
        "2nd Mode Frequency": tableData.categoricalFeatures.map((f) =>
          f.secondModeFrequency?.toString() ?? "N/A"
        ),
        "2nd Mode %": tableData.categoricalFeatures.map((f) =>
          formatCategoryPercent(f.secondModeFrequency, f.count)
        ),
        "Missing Entries": tableData.categoricalFeatures.map((f) =>
          formatMissingEntries(f.count, f.missingValuesCount)
        ),
      };
      if (combinedTables) {
        table.Datasets = tableData.categoricalFeatures.map(feature => feature.datasetCount || "1");
        table.Status = tableData.categoricalFeatures.map(feature => feature.status || "Individual dataset");
      }
      return table;
    }, [tableData, combinedTables, formatMissingEntries]);

    const selectTableRow = useCallback(entry => {
      const feature = [...tableData.continuousFeatures, ...tableData.categoricalFeatures, ...(tableData.dateFeatures || [])].find(f => f.featureName === entry.featureName);
      setSelectedEntry(feature?.pooled ? { ...entry, pooled: true } : entry);
    }, [tableData, setSelectedEntry]);

    const handleChartDoubleClick = useCallback((chartType, feature, previewShowOutliers) => {
      if (window.innerWidth < 768) return;
      let ChartComponent;
      let chartProps = {};

      switch (chartType) {
        case "continuous":
          ChartComponent = ContinuousChart;
          chartProps = { feature, showOutliers: previewShowOutliers, filterDescription: sourceFilter(appliedFilters, feature) };
          break;
        case "categorical":
          ChartComponent = CategoricalChart;
          chartProps = { feature, filterDescription: sourceFilter(appliedFilters, feature) };
          break;
        case "date":
          ChartComponent = DateChart;
          chartProps = {
            dateData: feature,
            dateDataKey: feature.featureName,
            showOutliers: previewShowOutliers,
            filterDescription: sourceFilter(appliedFilters, feature),
          };
          break;
        default:
          console.error("Unknown chart type:", chartType);
          return;
      }
      setPreviewContent(<ChartComponent {...chartProps} />);
      setIsPreviewOpen(true);
    }, [appliedFilters]);

    const closePreview = useCallback(() => setIsPreviewOpen(false), []);

    return (
      <div className={StatisticsDisplayStyles.chartFlexContainer} role="region" aria-label="Statistics display">
        <ChartPreview
          isOpen={isPreviewOpen}
          content={previewContent}
          closeModal={closePreview}
        />
        <div className={StatisticsDisplayStyles.tablesContainer}>
          <div className={StatisticsDisplayStyles.entrySearchWrapper}>
            <EntrySearch
              resultData={continuousDataForTable}
              onRowSelect={selectTableRow}
              selectedEntry={selectedEntry}
              type="continuous"
              actions={numericalTableActions}
              rowTitles={rowTitles}
              rowFilters={featureFilters}
            />
          </div>
          <div className={StatisticsDisplayStyles.entrySearchWrapper}>
            <EntrySearch
              resultData={categoricalDataForTable}
              onRowSelect={selectTableRow}
              selectedEntry={selectedEntry}
              type="categorical"
              actions={categoricalTableActions}
              rowTitles={rowTitles}
              rowFilters={featureFilters}
            />
          </div>
        </div>

        {sortedContinuousFeatures.map((feature) => (
          <ContinuousOverviewChart
            key={`continuous-${feature.featureName}`}
            feature={feature}
            showOutliers={showOutliers}
            onSelect={setSelectedEntry}
            onPreview={handleChartDoubleClick}
            filterDescription={sourceFilter(appliedFilters, feature)}
            isSelected={
              selectedEntry?.type === "continuous" &&
              selectedEntry?.featureName === feature.featureName
            }
          />
        ))}

        {sortedCategoricalFeatures.map((feature) => (
          <CategoricalOverviewChart
            key={`categorical-${feature.featureName}`}
            feature={feature}
            onSelect={setSelectedEntry}
            onPreview={handleChartDoubleClick}
            filterDescription={sourceFilter(appliedFilters, feature)}
            isSelected={
              selectedEntry?.type === "categorical" &&
              selectedEntry?.featureName === feature.featureName
            }
          />
        ))}

        {sortedDateFeatures.map((feature) => (
          <DateOverviewChart
            key={`date-${feature.featureName}`}
            feature={feature}
            showOutliers={showOutliers}
            onSelect={setSelectedEntry}
            onPreview={handleChartDoubleClick}
            filterDescription={sourceFilter(appliedFilters, feature)}
            isSelected={
              selectedEntry?.type === "continuous" &&
              selectedEntry?.featureName === feature.featureName
            }
          />
        ))}
      </div>
    );
  }
);

export default StatisticsDisplay;
