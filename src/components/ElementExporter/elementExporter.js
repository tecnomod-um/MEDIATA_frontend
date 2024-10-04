import React from "react";
import { useNavigate } from "react-router-dom";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import styles from "./elementExporter.module.css";

function ElementExporter({ data }) {
  const navigate = useNavigate();

  const generateCSV = ({
    categoricalFeatures = [],
    continuousFeatures = [],
    dateFeatures = [],
    omittedFeatures = [],
  }) => {
    const rows = [
      ...categoricalFeatures?.map(
        (feature) =>
          `${feature.featureName},${Object.keys(feature.categoryCounts).join(
            ","
          )}`
      ),
      ...continuousFeatures?.map((feature) => `${feature.featureName},integer`),
      ...dateFeatures?.map((feature) => `${feature.featureName},date`),
      ...omittedFeatures?.map(
        (feature) => `${feature.featureName},Natural Language`
      ),
    ];
    return rows.join("\n");
  };

  const handleDownloadButtonClick = () => {
    const csvString = generateCSV(data);
    const blob = new Blob([csvString], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "exported_elements.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSmallButtonClick = () => {
    const csvString = generateCSV(data);
    navigate("/rdfparser", { state: { csvData: csvString } });
  };

  return (
    <div className={styles.exportContainer}>
      <button
        className={styles.exportButton}
        onClick={handleDownloadButtonClick}
      >
        Export Elements
      </button>
      <button
        onClick={handleSmallButtonClick}
        className={styles.smallGreenButton}
      >
        <ArrowForwardIcon sx={{ fontSize: 16 }} />
      </button>
    </div>
  );
}

export default ElementExporter;
