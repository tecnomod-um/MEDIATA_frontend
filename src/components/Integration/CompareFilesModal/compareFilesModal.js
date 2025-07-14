import React, { useState, useEffect } from "react";
import OverlayWrapper from "../../Unused/OverlayWrapper/overlayWrapper";
import CollapsibleSection from "./collapsibleSection";
import styles from "./compareFilesModal.module.css";

// Helper to determine total row count for a file (using maximum count among features)
function getRowCount(file) {
  let rowCount = 0;
  const checkFeatures = (features) => {
    if (!features) return;
    features.forEach((feat) => {
      if (feat.count && feat.count > rowCount) {
        rowCount = feat.count;
      }
    });
  };
  checkFeatures(file.continuousFeatures);
  checkFeatures(file.categoricalFeatures);
  checkFeatures(file.dateFeatures);
  return rowCount;
}

// Helper to collect features with missing values.
function getMissingColumns(file) {
  const missing = [];
  const processFeatures = (features, type) => {
    if (!features) return;
    features.forEach((feat) => {
      const hasMissing =
        (feat.missingValuesCount && feat.missingValuesCount > 0) ||
        (feat.percentMissing && feat.percentMissing > 0);
      if (hasMissing) {
        missing.push({
          column: feat.originalName || feat.featureName.split(" (")[0],
          type,
          missingCount: feat.missingValuesCount || 0,
          percentMissing: feat.percentMissing || 0,
        });
      }
    });
  };
  processFeatures(file.continuousFeatures, "Continuous");
  processFeatures(file.categoricalFeatures, "Categorical");
  processFeatures(file.dateFeatures, "Date");
  return missing;
}

// Helper to collect features with outliers.
function getOutlierColumns(file) {
  const outliers = [];
  const processFeatures = (features, type) => {
    if (!features) return;
    features.forEach((feat) => {
      if (Array.isArray(feat.outliers) && feat.outliers.length > 0) {
        const uniqueOutliers = Array.from(new Set(feat.outliers));
        outliers.push({
          column: feat.originalName || feat.featureName.split(" (")[0],
          type,
          outlierValues: uniqueOutliers,
        });
      }
    });
  };
  processFeatures(file.continuousFeatures, "Continuous");
  processFeatures(file.categoricalFeatures, "Categorical");
  processFeatures(file.dateFeatures, "Date");
  return outliers;
}

const CompareFilesModal = ({ isOpen, closeModal, filesData }) => {
  const [collapsedStates, setCollapsedStates] = useState(
    filesData.map(() => ({ missing: false, outliers: false }))
  );

  useEffect(() => {
    setCollapsedStates(filesData.map(() => ({ missing: false, outliers: false })));
  }, [filesData]);

  const toggleMissing = (index) => {
    setCollapsedStates((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], missing: !updated[index].missing };
      return updated;
    });
  };

  const toggleOutliers = (index) => {
    setCollapsedStates((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], outliers: !updated[index].outliers };
      return updated;
    });
  };

  return (
    <OverlayWrapper isOpen={isOpen} closeModal={closeModal}>
      <div className={styles.modalContent}>
        {filesData.map((file, index) => {
          const rowCount = getRowCount(file);
          const missingColumns = getMissingColumns(file);
          const outlierColumns = getOutlierColumns(file);
          const missingCollapsed = collapsedStates[index]?.missing;
          const outliersCollapsed = collapsedStates[index]?.outliers;

          return (
            <div key={index} className={styles.fileSection}>
              <div className={styles.fileHeaderContainer}>
                <h3 className={styles.fileHeader}>
                  {file.fileName || `File #${index + 1}`}
                </h3>
                {rowCount > 0 && (
                  <span className={styles.rowCount}>{rowCount} rows</span>
                )}
              </div>
              <CollapsibleSection
                title="Missing Values"
                isCollapsed={missingCollapsed}
                toggle={() => toggleMissing(index)}
              >
                {missingColumns.length > 0 ? (
                  <div className={styles.scrollWrapper}>
                    <table className={styles.infoTable}>
                      <thead>
                        <tr>
                          <th>Column</th>
                          <th>Type</th>
                          <th>Missing Count</th>
                          <th>Missing %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {missingColumns.map((col, idx) => (
                          <tr key={idx}>
                            <td>{col.column}</td>
                            <td>{col.type}</td>
                            <td>{col.missingCount}</td>
                            <td>{col.percentMissing}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className={styles.noData}>No missing values detected</p>
                )}
              </CollapsibleSection>
              <CollapsibleSection
                title="Outliers"
                isCollapsed={outliersCollapsed}
                toggle={() => toggleOutliers(index)}
              >
                {outlierColumns.length > 0 ? (
                  <div className={styles.scrollWrapper}>
                    <table className={styles.infoTable}>
                      <thead>
                        <tr>
                          <th>Column</th>
                          <th>Type</th>
                          <th>Outlier Values</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outlierColumns.map((col, idx) => (
                          <tr key={idx}>
                            <td>{col.column}</td>
                            <td>{col.type}</td>
                            <td>
                              <span className={styles.outlierCount}>{col.outlierValues.length} items:</span>
                              <span className={styles.outlierValues}>
                                {col.outlierValues.join(", ")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className={styles.noData}>No outliers detected</p>
                )}
              </CollapsibleSection>
            </div>
          );
        })}
      </div>
    </OverlayWrapper>
  );
};

export default CompareFilesModal;
