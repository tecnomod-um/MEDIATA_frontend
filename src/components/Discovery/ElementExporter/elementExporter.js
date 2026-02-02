import React from "react";
import { useNavigate } from "react-router-dom";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import styles from "./elementExporter.module.css";
import { saveDatasetElements } from "../../../util/petitionHandler";
import { toast } from "react-toastify";
import { updateNodeAxiosBaseURL } from "../../../util/nodeAxiosSetup";
import { useNode } from "../../../context/nodeContext";

const stripFileSuffix = (featureName) => {
  if (!featureName) return featureName;
  const idx = featureName.lastIndexOf(" (");
  if (idx < 0) return featureName;

  const tail = featureName.slice(idx);
  if (/\([^()]+\.[^()]+\)\s*$/.test(tail)) {
    return featureName.slice(0, idx);
  }
  return featureName;
};

// Component for exporting dataset metadata and save in the backend. Feeds integration.
function ElementExporter({ dataResults = [], activeFileIndices = [], combinedData, filteredData }) {
  const navigate = useNavigate();
  const { selectedNodes } = useNode();

  const generateCSVForFile = (fileName) => {
    // helper: if filteredData is provided, only include features that appear in the filtered set
    const isFeatureVisible = (feature, featureType) => {
      // if a filteredData object was passed in, check for inclusion in its array for this feature type
      if (filteredData && filteredData[`${featureType}Features`]) {
        return filteredData[`${featureType}Features`].some(
          (item) => item.featureName === feature.featureName
        );
      }
      return true;
    };
  
    const categoricalFeatures = (combinedData.categoricalFeatures || [])
      .filter(
        (feature) =>
          feature.fileName === fileName &&
          isFeatureVisible(feature, "categorical")
      );
    const continuousFeatures = (combinedData.continuousFeatures || [])
      .filter(
        (feature) =>
          feature.fileName === fileName &&
          isFeatureVisible(feature, "continuous")
      );
    const dateFeatures = (combinedData.dateFeatures || [])
      .filter(
        (feature) =>
          feature.fileName === fileName && isFeatureVisible(feature, "date")
      );
    const omittedFeatures = (combinedData.omittedFeatures || [])
      .filter(
        (feature) =>
          feature.fileName === fileName &&
          isFeatureVisible(feature, "omitted")
      );
  
    const rows = [
      ...categoricalFeatures.map((feature) => {
        const trimmedName = stripFileSuffix(feature.featureName);
        return `${trimmedName},${Object.keys(feature.categoryCounts).join(",")}`;
      }),
      ...continuousFeatures.map((feature) => {
        const trimmedName = stripFileSuffix(feature.featureName);
        const isInteger =
          Number.isInteger(feature.min) && Number.isInteger(feature.max);
        const dataType = isInteger ? "integer" : "double";
        return `${trimmedName},${dataType},min:${feature.min},max:${feature.max}`;
      }),
      ...dateFeatures.map((feature) => {
        const trimmedName = stripFileSuffix(feature.featureName);
        return `${trimmedName},date,earliest:${feature.earliestDate},latest:${feature.latestDate}`;
      }),
      ...omittedFeatures.map((feature) => {
        const trimmedName = stripFileSuffix(feature.featureName);
        return `${trimmedName},Natural Language`;
      }),
    ];
    return rows.join("\n");
  };
  
  
  const saveAndStoreFile = async () => {
    const uploadedElementFiles = [];

    await Promise.all(
      dataResults.map(async (fileData, idx) => {
        if (!activeFileIndices[idx]) return;

        const fileName = fileData.fileName;
        const csvString = generateCSVForFile(fileName);
        const originalName = fileName || `File_${idx + 1}.csv`;
        const dotIndex = originalName.lastIndexOf(".");
        let base = originalName;
        if (dotIndex > 0) base = originalName.slice(0, dotIndex);
        const newName = `${base}.csv`;
        const savedElement = `${base}_elements.csv`;
        const nodeForFile = selectedNodes.find(
          (node) => node.nodeId === fileData.nodeId
        );
        if (nodeForFile && nodeForFile.serviceUrl)
          updateNodeAxiosBaseURL(nodeForFile.serviceUrl);
        else {
          console.error(`No serviceUrl found for nodeId: ${fileData.nodeId}`);
          return;
        }

        try {
          await saveDatasetElements(newName, csvString);
          toast.success(`${newName} saved on server.`);

          uploadedElementFiles.push({ nodeId: fileData.nodeId, fileName: savedElement, });

        } catch (error) {
          // console.error(`Failed to upload file ${originalName}:`, error);
          toast.error(`Failed to upload file ${originalName}: ${error.message}`);
        }
      })
    );

    return uploadedElementFiles;
  };

  const handleUploadButtonClick = async () => {
    await saveAndStoreFile();
  };

  const handleSmallButtonClick = async () => {
    const uploadedElementFiles = await saveAndStoreFile();
    // console.log(uploadedElementFiles);
    if (uploadedElementFiles.length > 0) {
      navigate("/integration", {
        state: { elementFiles: uploadedElementFiles },
      });
    } else {
      toast.info("No element files were selected or uploaded.");
    }
  };

  return (
    <div className={styles.exportContainer}>
      <button className={styles.exportButton} onClick={handleUploadButtonClick}>
        Upload Elements
      </button>
      <button onClick={handleSmallButtonClick} className={styles.smallGreenButton}>
        <ArrowForwardIcon sx={{ fontSize: 16 }} />
      </button>
    </div>
  );
}

export default ElementExporter;