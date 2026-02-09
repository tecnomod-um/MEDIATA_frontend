import React, { useRef } from "react";
import Switch from "react-switch";
import SaveIcon from "@mui/icons-material/Save";
import TooltipPopup from "../../Common/TooltipPopup/tooltipPopup.js";
import ColumnMappingStyles from "./columnMapping.module.css";

/**
 * Bottom control panel for column mapping with save button and mapping options.
 * Includes one-hot encoding switch, hierarchy removal option, and save functionality.
 */
function BottomControls({
  removeFromHierarchy,
  onRemoveFromHierarchyChange,
  useHotOneMapping,
  onUseHotOneMappingChange,
  onSave,
  isSaveDisabled,
  saveTooltipMessage,
  saveTooltipShown,
  onSaveTooltipClose,
}) {
  const saveButtonRef = useRef(null);

  return (
    <div className={ColumnMappingStyles.bottomRow}>
      <div className={ColumnMappingStyles.removeFromHierarchySelector}>
        <label title="Remove from hierarchy">
          <Switch
            checked={removeFromHierarchy}
            onChange={(checked) => onRemoveFromHierarchyChange(checked)}
            height={20}
            width={40}
            handleDiameter={16}
            offColor="#888"
            onColor="#9ABDDC"
          />
          <span className={ColumnMappingStyles.switchLabel}>Remove from hierarchy</span>
        </label>
      </div>

      <div className={ColumnMappingStyles.mappingTypeSelector}>
        <label title="One-Hot">
          <Switch
            checked={useHotOneMapping}
            onChange={(checked) => onUseHotOneMappingChange(checked)}
            height={20}
            width={40}
            handleDiameter={16}
            offColor="#888"
            onColor="#9ABDDC"
          />
          <span className={ColumnMappingStyles.switchLabel}>One-Hot</span>
        </label>
      </div>

      <button
        onClick={onSave}
        className={`${ColumnMappingStyles.saveButton} ${
          isSaveDisabled ? ColumnMappingStyles.saveButtonDisabled : ""
        }`}
        aria-disabled={isSaveDisabled}
        title="Save Mapping"
        ref={saveButtonRef}
        type="button"
      >
        <span className={ColumnMappingStyles.buttonText}>Save</span>
        <span className={ColumnMappingStyles.iconWrapper}>
          <SaveIcon fontSize="inherit" className={ColumnMappingStyles.buttonIcon} />
        </span>
      </button>
      {saveTooltipShown && saveButtonRef.current && (
        <TooltipPopup
          message={saveTooltipMessage}
          buttonRef={saveButtonRef}
          onClose={onSaveTooltipClose}
        />
      )}
    </div>
  );
}

export default BottomControls;
