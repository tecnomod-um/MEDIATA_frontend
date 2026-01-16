import React, { useState, useMemo, useCallback } from "react";
import ContinuousChart from "../ContinuousChart/continuousChart";
import CategoricalChart from "../CategoricalChart/categoricalChart";
import DateChart from "../DateChart/dateChart";
import EntrySearch from "../EntrySearch/entrySearch";
import StatisticsDisplayStyles from "./statisticsDisplay.module.css";
import ChartPreview from "../ChartPreview/chartPreview";

// Display for individual statistics, contains tables and graphs
const StatisticsDisplay = React.memo(
  ({ data, showOutliers, setSelectedEntry, selectedEntry }) => {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewContent, setPreviewContent] = useState(null);

    const formatMissingEntries = useCallback((count, missingValuesCount) => {
      const missingPercentage = ((missingValuesCount / count) * 100).toFixed(2);
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
      data.continuousFeatures.forEach((feature) => {
        table.Name.push(feature.featureName);
        table["Count"].push(feature.count.toString());
        table["Mean"].push(feature.mean.toFixed(2));
        table["Std. Dev."].push(feature.stdDev.toFixed(2));
        table["Min"].push(feature.min.toString());
        table["1st Qrt."].push(feature.qrt1.toFixed(2));
        table["Median"].push(feature.median.toFixed(2));
        table["3rd Qrt."].push(feature.qrt3.toFixed(2));
        table["Max"].push(feature.max.toString());
        table["Missing Entries"].push(
          formatMissingEntries(feature.count, feature.missingValuesCount)
        );
      });
      if (data.dateFeatures && data.dateFeatures.length > 0) {
        data.dateFeatures.forEach((dateStat) => {
          table.Name.push(dateStat.featureName);
          table["Count"].push(dateStat.count.toString());
          table["Mean"].push(dateStat.mean ?? "N/A");
          table["Std. Dev."].push(
            dateStat.stdDev ? dateStat.stdDev.toFixed(2) : "N/A"
          );
          table["Min"].push(dateStat.earliestDate || "N/A");
          table["1st Qrt."].push(dateStat.q1 || "N/A");
          table["Median"].push(dateStat.median || "N/A");
          table["3rd Qrt."].push(dateStat.q3 || "N/A");
          table["Max"].push(dateStat.latestDate || "N/A");
          table["Missing Entries"].push(
            formatMissingEntries(dateStat.count, dateStat.missingValuesCount)
          );
        });
      }
      return table;
    }, [data, formatMissingEntries]);

    const categoricalDataForTable = useMemo(() => {
      return {
        Name: data.categoricalFeatures.map((f) => f.featureName),
        "Total Count": data.categoricalFeatures.map((f) =>
          f.count.toString()
        ),
        Mode: data.categoricalFeatures.map((f) => f.mode || "N/A"),
        "Mode Frequency": data.categoricalFeatures.map((f) =>
          f.modeFrequency ? f.modeFrequency.toString() : "N/A"
        ),
        "Mode %": data.categoricalFeatures.map((f) =>
          f.modeFrequencyPercentage
            ? `${f.modeFrequencyPercentage.toFixed(2)}%`
            : "N/A"
        ),
        "2nd Mode": data.categoricalFeatures.map((f) => f.secondMode || "N/A"),
        "2nd Mode Frequency": data.categoricalFeatures.map((f) =>
          f.secondModeFrequency ? f.secondModeFrequency.toString() : "N/A"
        ),
        "2nd Mode %": data.categoricalFeatures.map((f) =>
          f.secondModePercentage
            ? `${f.secondModePercentage.toFixed(2)}%`
            : "N/A"
        ),
        "Missing Entries": data.categoricalFeatures.map((f) =>
          formatMissingEntries(f.count, f.missingValuesCount)
        ),
      };
    }, [data, formatMissingEntries]);

    const handleChartDoubleClick = useCallback((chartType, feature) => {
      if (window.innerWidth < 768) return;
      let ChartComponent;
      let chartProps = {};

      switch (chartType) {
        case "continuous":
          ChartComponent = ContinuousChart;
          chartProps = { feature, showOutliers };
          break;
        case "categorical":
          ChartComponent = CategoricalChart;
          chartProps = { feature };
          break;
        case "date":
          ChartComponent = DateChart;
          chartProps = {
            dateData: feature,
            dateDataKey: feature.featureName,
            showOutliers,
          };
          break;
        default:
          console.error("Unknown chart type:", chartType);
          return;
      }
      setPreviewContent(<ChartComponent {...chartProps} />);
      setIsPreviewOpen(true);
    },
      [showOutliers]
    );

    return (
      <div className={StatisticsDisplayStyles.chartFlexContainer} role="region" aria-label="Statistics display">
        <ChartPreview
          isOpen={isPreviewOpen}
          content={previewContent}
          closeModal={() => setIsPreviewOpen(false)}
        />
        <div className={StatisticsDisplayStyles.tablesContainer}>
          <div className={StatisticsDisplayStyles.entrySearchWrapper}>
            <EntrySearch
              resultData={continuousDataForTable}
              onRowSelect={setSelectedEntry}
              selectedEntry={selectedEntry}
              type="continuous"
            />
          </div>
          <div className={StatisticsDisplayStyles.entrySearchWrapper}>
            <EntrySearch
              resultData={categoricalDataForTable}
              onRowSelect={setSelectedEntry}
              selectedEntry={selectedEntry}
              type="categorical"
            />
          </div>
        </div>

        {sortedContinuousFeatures.map((feature) => (
          <ContinuousChart
            key={`continuous-${feature.featureName}`}
            feature={feature}
            showOutliers={showOutliers}
            onClick={() =>
              setSelectedEntry({
                type: "continuous",
                featureName: feature.featureName,
              })
            }
            onDoubleClick={() =>
              handleChartDoubleClick("continuous", feature)
            }
            isSelected={
              selectedEntry?.type === "continuous" &&
              selectedEntry?.featureName === feature.featureName
            }
            inOverview={true}
          />
        ))}

        {sortedCategoricalFeatures.map((feature) => (
          <CategoricalChart
            key={`categorical-${feature.featureName}`}
            feature={feature}
            onClick={() =>
              setSelectedEntry({
                type: "categorical",
                featureName: feature.featureName,
              })
            }
            onDoubleClick={() =>
              handleChartDoubleClick("categorical", feature)
            }
            isSelected={
              selectedEntry?.type === "categorical" &&
              selectedEntry?.featureName === feature.featureName
            }
            inOverview={true}
          />
        ))}

        {sortedDateFeatures.map((feature) => (
          <DateChart
            key={`date-${feature.featureName}`}
            dateData={feature}
            dateDataKey={feature.featureName}
            showOutliers={showOutliers}
            onClick={() =>
              setSelectedEntry({
                type: "continuous",
                featureName: feature.featureName,
              })
            }
            onDoubleClick={() =>
              handleChartDoubleClick("date", feature)
            }
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
