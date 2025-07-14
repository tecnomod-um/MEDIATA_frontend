import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import MappingsResultStyles from "./mappingsResult.module.css";

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

function MappingsExporter({ mappings }) {
  const navigate = useNavigate();

  const handleUploadMappings = () => {
    try {
      const csvString = generateMappingsCSV(mappings);
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "mappings_elements.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Mappings CSV generated successfully!");
    } catch (error) {
      console.error("Failed to generate CSV:", error);
      toast.error(`Error generating CSV: ${error.message}`);
    }
  };

  const handleNavigateToSemanticAlignment = () => {
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
    <div className={MappingsResultStyles.uploadMappingsContainer}>
      <button onClick={handleUploadMappings} className={MappingsResultStyles.uploadMappingsButton}>
        Download Mappings
      </button>
      <button
        className={MappingsResultStyles.uploadArrowButton}
        onClick={handleNavigateToSemanticAlignment}
      >
        <ArrowForwardIcon sx={{ fontSize: 16 }} />
      </button>
    </div>
  );
}

export default MappingsExporter;
