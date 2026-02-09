import React, { useRef, useState } from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DescriptionIcon from "@mui/icons-material/Description";
import AutocompleteInput from "../../Common/AutoCompleteInput/autoCompleteInput.js";
import TooltipPopup from "../../Common/TooltipPopup/tooltipPopup.js";
import ColumnMappingStyles from "./columnMapping.module.css";

/**
 * Panel for configuring the union column name, terminology, and description.
 * Includes autocomplete for schema-based suggestions and SNOMED terminology.
 */
function UnionConfigPanel({
  unionName,
  onUnionNameChange,
  unionNameSuggestions,
  unionTerminology,
  onUnionTerminologyChange,
  unionTerminologySuggestions,
  onOpenDescriptionModal,
}) {
  const headerTooltipButtonRef = useRef(null);
  const [showHeaderTooltip, setShowHeaderTooltip] = useState(false);

  return (
    <>
      <div className={ColumnMappingStyles.sectionHeader}>
        <h2 className={ColumnMappingStyles.sectionTitle}>Define mapping rules</h2>

        <div className={ColumnMappingStyles.tooltipContainer}>
          <InfoOutlinedIcon
            ref={headerTooltipButtonRef}
            className={ColumnMappingStyles.tooltipIcon}
            onMouseEnter={() => setShowHeaderTooltip(true)}
            onMouseLeave={() => setShowHeaderTooltip(false)}
          />
          {showHeaderTooltip && (
            <TooltipPopup
              message={
                "Create a column in the datasets with a given name.\nIt's values will be set based on the defined mappings from the selected columns."
              }
              buttonRef={headerTooltipButtonRef}
              onClose={() => setShowHeaderTooltip(false)}
              offsetY={-10}
            />
          )}
        </div>
      </div>

      <div className={ColumnMappingStyles.entryHeaderRow}>
        <AutocompleteInput
          value={unionName}
          onChange={onUnionNameChange}
          placeholder="New column's name"
          className={ColumnMappingStyles.unionInput}
          suggestions={unionNameSuggestions}
        />

        <AutocompleteInput
          value={unionTerminology}
          onChange={onUnionTerminologyChange}
          placeholder="Column's terminology"
          className={ColumnMappingStyles.snomedInput}
          suggestions={unionTerminologySuggestions}
        />

        <button
          type="button"
          className={ColumnMappingStyles.descriptionButton}
          onClick={onOpenDescriptionModal}
        >
          <DescriptionIcon fontSize="small" />
        </button>
      </div>
    </>
  );
}

export default UnionConfigPanel;
