import React, { useRef } from "react";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionIcon from "@mui/icons-material/Description";
import AutocompleteInput from "../../Common/AutoCompleteInput/autoCompleteInput.js";
import TooltipPopup from "../../Common/TooltipPopup/tooltipPopup.js";
import ColumnMappingStyles from "./columnMapping.module.css";

// Component for displaying and managing the list of custom values with their mappings
function ValuesList({
  customValues,
  groups,
  valueContentSuggestions,
  valueTerminologySuggestionLabelsFor,
  snomedValueTerminologySuggestions,
  isTooltipShown,
  tooltipRef,
  tooltipMessage,
  onTooltipClose,
  onValueNameChange,
  onValueSnomedChange,
  onAddMapping,
  onRemoveMapping,
  onRemoveValue,
  onOpenDescription,
  isLockedNumericValue,
  buttonRefs,
}) {
  const mappingRefs = useRef({});

  const formatValue = (value, type) => {
    if (type === "date") {
      const date = new Date(value);
      return date instanceof Date && !isNaN(date)
        ? date.toISOString().split("T")[0]
        : "";
    }
    return value !== undefined && value !== null ? value.toString() : "";
  };

  const bracketed = (s) => {
    const t = (s ?? "").trim();
    if (!t) return "";
    if (t.startsWith("[") && t.endsWith("]")) return t;
    return `[${t}]`;
  };

  return (
    <TransitionGroup
      className={`${ColumnMappingStyles.valueListContainer} ${
        customValues.length ? ColumnMappingStyles.hasValues : ""
      }`}
    >
      {customValues.map((customValue, index) => {
        if (!mappingRefs.current[customValue.id])
          mappingRefs.current[customValue.id] = React.createRef();

        const isLocked = isLockedNumericValue(customValue);
        const hasRowActions = !isLocked;
        const descBtnStyle = hasRowActions
          ? {}
          : {
              borderTopRightRadius: "5px",
              borderBottomRightRadius: "5px",
            };

        return (
          <CSSTransition
            key={customValue.id}
            timeout={500}
            classNames={{
              enter: ColumnMappingStyles.enter,
              enterActive: ColumnMappingStyles.enterActive,
              exit: ColumnMappingStyles.exit,
              exitActive: ColumnMappingStyles.exitActive,
            }}
            nodeRef={mappingRefs.current[customValue.id]}
          >
            <div
              ref={mappingRefs.current[customValue.id]}
              className={ColumnMappingStyles.valueMappingContainer}
            >
              <div className={ColumnMappingStyles.valueMappingRow}>
                <AutocompleteInput
                  value={
                    isLocked
                      ? bracketed(customValue.name + " range")
                      : customValue.name
                  }
                  onChange={(raw) => {
                    if (isLocked) return;
                    onValueNameChange(customValue.id, raw);
                  }}
                  placeholder="Value content"
                  className={`${ColumnMappingStyles.valueNameInput} ${
                    isLocked ? ColumnMappingStyles.lockedValueInput : ""
                  }`}
                  suggestions={valueContentSuggestions}
                  disabled={isLocked}
                />

                <AutocompleteInput
                  value={customValue.snomedTerm || ""}
                  onChange={(raw) => {
                    const hits =
                      snomedValueTerminologySuggestions[customValue.id] || [];
                    const hit = hits.find(
                      (s) => s.value === raw || s.label === raw
                    );
                    onValueSnomedChange(
                      customValue.id,
                      hit ? hit.value : raw
                    );
                  }}
                  placeholder="Value terminology"
                  className={ColumnMappingStyles.valueSnomedInput}
                  suggestions={valueTerminologySuggestionLabelsFor(
                    customValue.id
                  )}
                />

                <button
                  type="button"
                  className={ColumnMappingStyles.descriptionButton}
                  style={descBtnStyle}
                  onClick={() => onOpenDescription(index)}
                >
                  <span className={ColumnMappingStyles.buttonText}>
                    Description
                  </span>
                  <span className={ColumnMappingStyles.iconWrapper}>
                    <DescriptionIcon
                      fontSize="inherit"
                      className={ColumnMappingStyles.buttonIcon}
                    />
                  </span>
                </button>

                {isTooltipShown && tooltipRef && (
                  <TooltipPopup
                    message={tooltipMessage}
                    buttonRef={tooltipRef}
                    onClose={onTooltipClose}
                  />
                )}

                {hasRowActions && (
                  <>
                    <button
                      ref={buttonRefs.current[index]}
                      onClick={() => onAddMapping(index)}
                      className={ColumnMappingStyles.addMappingButton}
                    >
                      <span className={ColumnMappingStyles.buttonText}>
                        Add Mapping
                      </span>
                      <span className={ColumnMappingStyles.iconWrapper}>
                        <AddIcon
                          fontSize="inherit"
                          className={ColumnMappingStyles.buttonIcon}
                        />
                      </span>
                    </button>

                    <button
                      onClick={() => onRemoveValue(index)}
                      className={ColumnMappingStyles.closeIconButton}
                    >
                      <CloseIcon />
                    </button>
                  </>
                )}
              </div>

              {!isLocked && customValue.mapping.length > 0 && (
                <div className={ColumnMappingStyles.mappingSummary}>
                  {customValue.mapping.length} values from{" "}
                  {new Set(customValue.mapping.map((m) => m.groupColumn)).size}{" "}
                  columns mapped
                </div>
              )}

              <ul className={ColumnMappingStyles.currentMappings}>
                {customValue.mapping.map((map, mapIndex) => {
                  const sameColumn = customValue.mapping.filter(
                    (m) => m.groupColumn === map.groupColumn
                  );
                  const distinctSources = new Set(
                    sameColumn.map(
                      (m) =>
                        m.groupKey ??
                        `${m.nodeId}::${m.fileName}::${m.groupColumn}`
                    )
                  );
                  const isAmbiguous = distinctSources.size > 1;

                  const displayVal =
                    typeof map.value === "object" &&
                    map.value.minValue !== undefined
                      ? `${formatValue(
                          map.value.minValue,
                          map.value.type
                        )} - ${formatValue(map.value.maxValue, map.value.type)}`
                      : map.value;

                  return (
                    <li
                      key={mapIndex}
                      className={ColumnMappingStyles.mappedItem}
                    >
                      <div className={ColumnMappingStyles.mappedRow}>
                        <span className={ColumnMappingStyles.mappedLabel}>
                          From {map.groupColumn}
                          {isAmbiguous ? ` (from ${map.fileName})` : ""}:
                        </span>
                        <span className={ColumnMappingStyles.mappedValue}>
                          {displayVal}
                        </span>

                        {!isLocked && (
                          <button
                            className={ColumnMappingStyles.closeIconButton}
                            onClick={() => onRemoveMapping(index, mapIndex)}
                          >
                            <CloseIcon />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CSSTransition>
        );
      })}
    </TransitionGroup>
  );
}

export default ValuesList;
