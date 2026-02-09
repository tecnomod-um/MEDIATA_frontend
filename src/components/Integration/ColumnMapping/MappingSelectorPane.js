import React from "react";
import CloseIcon from "@mui/icons-material/Close";
import RangePicker from "../RangePicker/rangePicker.js";
import { darkenColor } from "../../../util/colors.js";
import ColumnMappingStyles from "./columnMapping.module.css";

/**
 * Sliding pane for selecting mappings from available column values.
 * Displays groups with their available values and allows selection.
 */
function MappingSelectorPane({
  isVisible,
  paneRef,
  currentGroupIndex,
  currentValueName,
  groups,
  onClose,
  onSelectMapping,
  getGroupKey,
  extractMinMax,
  getAvailableValues,
  getUnavailableRanges,
}) {
  if (currentGroupIndex === null) {
    return (
      <div
        ref={paneRef}
        className={`${ColumnMappingStyles.slidingPane} ${
          isVisible ? ColumnMappingStyles.paneVisible : ""
        }`}
      />
    );
  }

  return (
    <div
      ref={paneRef}
      className={`${ColumnMappingStyles.slidingPane} ${
        isVisible ? ColumnMappingStyles.paneVisible : ""
      }`}
    >
      <div className={ColumnMappingStyles.selectMappingContainer}>
        <div className={ColumnMappingStyles.selectMappingHeader}>
          <h5>
            {currentValueName.trim()
              ? `Create mappings for "${currentValueName}"`
              : "Create mappings for the set value"}
          </h5>
          <button onClick={onClose} className={ColumnMappingStyles.closeIconButton}>
            <CloseIcon />
          </button>
        </div>

        {groups.map((group) => {
          const darkenedColor = darkenColor(group.color, -30);
          const firstValueType = group.values[0];
          const { min, max } = extractMinMax(group.values, firstValueType);
          const unavailableRanges = getUnavailableRanges(group);
          const availableValues = getAvailableValues(group);
          const allMapped = availableValues.length === 0;

          return (
            <div key={getGroupKey(group)} className={ColumnMappingStyles.mappingGroup}>
              <div className={ColumnMappingStyles.columnTitle}>
                <span
                  className={ColumnMappingStyles.columnName}
                  style={{ color: darkenedColor }}
                >
                  {group.column}
                </span>
                <span className={ColumnMappingStyles.columnFileInline}>
                  from {group.fileName}
                </span>
              </div>

              {allMapped ? (
                <p className={ColumnMappingStyles.allMappedMessage}>
                  All categories have been mapped.
                </p>
              ) : firstValueType === "integer" ||
                firstValueType === "double" ||
                firstValueType === "date" ? (
                <RangePicker
                  min={min}
                  max={max}
                  type={firstValueType}
                  onRangeChange={(newRange) => {
                    onSelectMapping(group, {
                      minValue: newRange.minValue,
                      maxValue: newRange.maxValue,
                      type: firstValueType,
                    });
                  }}
                  unavailableRanges={unavailableRanges}
                />
              ) : (
                <ul className={ColumnMappingStyles.mappingOptions}>
                  {availableValues.map((value, valueIndex) => (
                    <li key={valueIndex}>
                      <button
                        onClick={() => onSelectMapping(group, value)}
                        className={ColumnMappingStyles.mappingButton}
                      >
                        {value}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MappingSelectorPane;
