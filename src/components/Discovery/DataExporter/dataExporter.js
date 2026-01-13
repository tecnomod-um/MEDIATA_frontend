import React from "react";
import { jsonToCSV } from "../../../util/parser";

function DataExporter({ data, filteredData }) {
  const exportData = () => {
    const continuousAndDateData = data.continuousFeatures.map((feature) => ({
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
    }));

    data.dateFeatures.forEach((dateStat) => {
      continuousAndDateData.push({
        Name: dateStat.featureName,
        Count: dateStat.count.toString(),
        Mean: dateStat.mean ? dateStat.mean.toString() : "N/A",
        "Std. Dev.": dateStat.stdDev ? dateStat.stdDev.toFixed(2) : "N/A",
        Min: dateStat.earliestDate || "N/A",
        "1st Qrt.": dateStat.q1 || "N/A",
        Median: dateStat.median || "N/A",
        "3rd Qrt.": dateStat.q3 || "N/A",
        Max: dateStat.latestDate || "N/A",
        "Missing Entries": dateStat.missingValuesCount.toString(),
      });
    });

    const categoricalData = data.categoricalFeatures.map((feature) => ({
      Name: feature.featureName,
      "Total Count": feature.count.toString(),
      Mode: feature.mode || "N/A",
      "Mode Frequency": feature.modeFrequency
        ? feature.modeFrequency.toString()
        : "N/A",
      "Mode %": feature.modeFrequencyPercentage
        ? feature.modeFrequencyPercentage.toFixed(2) + "%"
        : "N/A",
      "2nd Mode": feature.secondMode || "N/A",
      "2nd Mode Frequency": feature.secondModeFrequency
        ? feature.secondModeFrequency.toString()
        : "N/A",
      "2nd Mode %": feature.secondModePercentage
        ? feature.secondModePercentage.toFixed(2) + "%"
        : "N/A",
      "Missing Entries": feature.missingValuesCount.toString(),
      CategoryCounts: JSON.stringify(feature.categoryCounts),
    }));

    // Convert to CSV
    const continuousAndDateCSV = jsonToCSV(continuousAndDateData);
    const categoricalCSV = jsonToCSV(categoricalData);

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
  };

  return <button onClick={exportData} aria-label="Export statistics data to CSV files">Export Data</button>;
}

export default DataExporter;
