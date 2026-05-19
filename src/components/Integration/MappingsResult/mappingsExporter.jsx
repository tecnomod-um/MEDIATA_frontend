import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import MappingsResultStyles from "./mappingsResult.module.css";
import TooltipPopup from "../../Common/TooltipPopup/tooltipPopup";
import { useAuth } from "../../../context/authContext";
import { buildMappingSpec } from "../../../util/mappingSpec";

// Exports the integration mappings object to CSV
function generateMappingsCSV(mappings) {
  const lines = [];

  mappings.forEach((mappingObj) => {
    Object.entries(mappingObj).forEach(([mappingKey, definition]) => {
      const allValues = [];
      definition.groups.forEach((grp) => {
        grp.values.forEach((valObj) => allValues.push(valObj.name));
      });

      const isNumeric =
        allValues.includes("integer") || allValues.includes("double");
      const isDate = allValues.includes("date");

      if (isNumeric) {
        let minVal = null;
        let maxVal = null;
        allValues.forEach((v) => {
          if (v.startsWith("min:")) minVal = v.slice(4);
          if (v.startsWith("max:")) maxVal = v.slice(4);
        });
        const type = allValues.includes("integer") ? "integer" : "double";
        lines.push(`${mappingKey},${type},min:${minVal || ""},max:${maxVal || ""}`);
      } else if (isDate) {
        let earliest = null;
        let latest = null;
        allValues.forEach((v) => {
          if (v.startsWith("earliest:")) earliest = v.slice(9);
          if (v.startsWith("latest:")) latest = v.slice(7);
        });
        lines.push(`${mappingKey},date,earliest:${earliest || ""},latest:${latest || ""}`);
      } else {
        const categories = allValues.filter(
          (v) =>
            !v.startsWith("min:") &&
            !v.startsWith("max:") &&
            !v.startsWith("earliest:") &&
            !v.startsWith("latest:") &&
            v !== "integer" &&
            v !== "double" &&
            v !== "date"
        );
        const uniqueCats = Array.from(new Set(categories));
        lines.push(`${mappingKey},${uniqueCats.join(",")}`);
      }
    });
  });

  return lines.join("\n");
}

function MappingsExporter({ mappings, schema, onUploadMappings }) {
  const navigate = useNavigate();
  const { capabilities } = useAuth();

  const hasSemanticAlignment = !!capabilities?.semanticAlignment;

  const arrowWrapperRef = useRef(null);
  const fileInputRef = useRef(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadMappings = () => {
    try {
      const mappingSpec = buildMappingSpec({
        mappings,
        schema,
      });
  
      const specBlob = new Blob(
        [JSON.stringify(mappingSpec, null, 2)],
        { type: "application/json;charset=utf-8;" }
      );
  
      downloadBlob(specBlob, "mapping_spec.json");
      toast.success("Mapping spec downloaded successfully!");
    } catch (error) {
      console.error("Failed to generate downloads:", error);
      toast.error(`Error generating downloads: ${error.message}`);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await onUploadMappings?.(parsed);
    } catch (error) {
      console.error("Failed to upload mapping spec:", error);
      toast.error(`Error loading mapping spec: ${error.message}`);
    }
  };

  const handleNavigateToSemanticAlignment = () => {
    if (!hasSemanticAlignment) return;

    try {
      const csvString = generateMappingsCSV(mappings);
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });

      const reader = new FileReader();
      reader.onload = () => {
        const csvBase64 = reader.result.split(",")[1];
        navigate("/semanticalignment", {
          state: { csvData: csvBase64, fileName: "mappings_elements.csv" },
        });
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Failed to prepare CSV for navigation:", error);
      toast.error("Error processing CSV for RDF Builder.");
    }
  };

  return (
    <div className={MappingsResultStyles.exportActions}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: "none" }}
        onChange={handleUploadFileChange}
      />

      <div className={MappingsResultStyles.topExportRow}>
        <button
          className={MappingsResultStyles.uploadMappingsButton}
          type="button"
          onClick={handleUploadClick}
        >
          Upload mappings
        </button>

        <div className={MappingsResultStyles.downloadWithArrow}>
          <button
            onClick={handleDownloadMappings}
            className={MappingsResultStyles.downloadMappingsButton}
            type="button"
          >
            Download mappings
          </button>

          <div
            ref={arrowWrapperRef}
            className={MappingsResultStyles.uploadArrowButtonWrapper}
            onMouseEnter={() => {
              if (!hasSemanticAlignment) setShowTooltip(true);
            }}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <button
              className={`${MappingsResultStyles.uploadArrowButton} ${
                !hasSemanticAlignment ? MappingsResultStyles.uploadArrowButtonDisabled : ""
              }`}
              onClick={handleNavigateToSemanticAlignment}
              disabled={!hasSemanticAlignment}
              aria-disabled={!hasSemanticAlignment}
              type="button"
            >
              <ArrowForwardIcon sx={{ fontSize: 16 }} />
            </button>

            {showTooltip && arrowWrapperRef.current && (
              <TooltipPopup
                message="This deployment does not include Semantic Alignment."
                buttonRef={arrowWrapperRef}
                onClose={() => setShowTooltip(false)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MappingsExporter;
