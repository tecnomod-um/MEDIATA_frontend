import React from "react";
import { statisticsObjectsCsv } from "../../../util/statisticsCsv";
import { combinedStatisticsCsv, summaryConventions } from "../CombinedStatistics/combinedStatistics";
import { relationshipStatisticsCsv, formatCategoryPercent } from "../discoveryStatistics";

// Exporting functionality from the discovery statistical data to CSV
function DataExporter({ data, filteredData, statisticsExport, relationshipExport, busy }) {
  const exportData = () => {
    if (relationshipExport) {
      downloadCSV(relationshipStatisticsCsv(relationshipExport.data, relationshipExport.featureFilters, relationshipExport.appliedFilters), "relationship_statistics.csv");
      return;
    }
    if (statisticsExport) {
      downloadCSV(combinedStatisticsCsv(statisticsExport.features, statisticsExport.cohort), "combined_statistics.csv");
      return;
    }
    const sourceData = filteredData?.continuousFeatures ? filteredData : data;
    const continuousAndDateData = sourceData.continuousFeatures.map((feature) => ({
      Name: feature.featureName,
      Count: feature.count.toString(),
      Mean: feature.mean.toFixed(2),
      "Std. Dev.": feature.stdDev.toFixed(2),
      Min: feature.min.toString(),
      "1st Qrt.": feature.qrt1.toFixed(2),
      Median: feature.median.toFixed(2),
      "3rd Qrt.": feature.qrt3.toFixed(2),
      Max: feature.max.toString(),
      "Missing Entries": feature.missingValuesCount.toString(),
      Methods: summaryConventions.continuous,
    }));

    sourceData.dateFeatures.forEach((dateStat) => {
      continuousAndDateData.push({
        Name: dateStat.featureName,
        Count: dateStat.count.toString(),
        Mean: dateStat.mean ? dateStat.mean.toString() : "N/A",
        "Std. Dev.": dateStat.stdDev != null ? dateStat.stdDev.toFixed(2) : "N/A",
        Min: dateStat.earliestDate || "N/A",
        "1st Qrt.": dateStat.q1 || "N/A",
        Median: dateStat.median || "N/A",
        "3rd Qrt.": dateStat.q3 || "N/A",
        Max: dateStat.latestDate || "N/A",
        "Missing Entries": dateStat.missingValuesCount.toString(),
        Methods: summaryConventions.date,
      });
    });

    const categoricalData = sourceData.categoricalFeatures.map((feature) => ({
      Name: feature.featureName,
      "Total Count": feature.count.toString(),
      Mode: feature.mode || "N/A",
      "Mode Frequency": feature.modeFrequency
        ? feature.modeFrequency.toString()
        : "N/A",
      "Mode %": formatCategoryPercent(feature.modeFrequency, feature.count),
      "2nd Mode": feature.secondMode || "N/A",
      "2nd Mode Frequency": feature.secondModeFrequency
        ? feature.secondModeFrequency.toString()
        : "N/A",
      "2nd Mode %": formatCategoryPercent(feature.secondModeFrequency, feature.count),
      "Missing Entries": feature.missingValuesCount.toString(),
      CategoryCounts: JSON.stringify(feature.categoryCounts),
      Methods: summaryConventions.categorical,
    }));

    // Convert to CSV
    const continuousAndDateCSV = statisticsObjectsCsv(continuousAndDateData);
    const categoricalCSV = statisticsObjectsCsv(categoricalData);

    // Download CSV
    downloadCSV(continuousAndDateCSV, "continuous_data.csv");
    downloadCSV(categoricalCSV, "categorical_data.csv");
  };

  const downloadCSV = (csvString, filename) => {
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  return <button onClick={exportData} disabled={busy} aria-label="Export statistics data to CSV files">Export Data</button>;
}

export default DataExporter;
