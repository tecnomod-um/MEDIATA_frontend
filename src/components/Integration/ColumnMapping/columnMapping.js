import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import ColumnMappingStyles from "./columnMapping.module.css";
import Switch from "react-switch";
import TooltipPopup from "../../Common/TooltipPopup/tooltipPopup.js";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import RangePicker from "../RangePicker/rangePicker.js";
import AutocompleteInput from "../../Common/AutoCompleteInput/autoCompleteInput.js";
import { darkenColor } from "../../../util/colors.js";
import { stringify } from "querystring";

function ColumnMapping({ onMappingChange, onSave, groups, schema }) {
  const [unionName, setUnionName] = useState("");
  const [customValues, setCustomValues] = useState([]);
  const [removeFromHierarchy, setRemoveFromHierarchy] = useState(false);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(null);
  const [isPaneVisible, setIsPaneVisible] = useState(false);
  const [useHotOneMapping, setUseHotOneMapping] = useState(false);
  const buttonRefs = useRef([]);
  const paneRef = useRef(null);
  const [tooltipMessage, setTooltipMessage] = useState("Tooltip message.");
  const [isTooltipShown, setTooltipShown] = useState(false);
  const [tooltipRef, setTooltipRef] = useState(null);
  const [dropAreaHeight, setDropAreaHeight] = useState(200);
  const containerRef = useRef(null);
  const resizingRef = useRef(false);
  const mappingRefs = useRef({});

  const parsedSchema = useMemo(() => {
    if (schema && typeof schema === "string") {
      try {
        return JSON.parse(schema);
      } catch (e) {
        return null;
      }
    }
    return schema;
  }, [schema]);

  const unionInputSuggestions = useMemo(() => {
    if (parsedSchema && parsedSchema.properties)
      return Object.keys(parsedSchema.properties);
    return [];
  }, [parsedSchema]);

  const unionEnumSuggestions = useMemo(() => {
    if (parsedSchema && parsedSchema.properties && unionName) {
      const matchingKey = Object.keys(parsedSchema.properties).find(
        (key) => key.toLowerCase() === unionName.toLowerCase()
      );
      if (matchingKey && parsedSchema.properties[matchingKey].enum)
        return parsedSchema.properties[matchingKey].enum;
    }
    return [];
  }, [parsedSchema, unionName]);

  useEffect(() => {
    onMappingChange(groups);
  }, [groups, onMappingChange]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (paneRef.current && !paneRef.current.contains(event.target)) {
        setIsPaneVisible(false);
        setCurrentGroupIndex(null);
      }
    };
    if (isPaneVisible)
      document.addEventListener("mousedown", handleClickOutside);
    else
      document.removeEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPaneVisible]);

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedColumn = JSON.parse(e.dataTransfer.getData("column"));
    if (!groups.some((group) => group.column === droppedColumn.column)) {
      const newGroups = [...groups, droppedColumn];
      onMappingChange(newGroups);
    }
  };

  const handleUnionNameChange = (val) => {
    setUnionName(val);
  };

  const addNewValue = () => {
    const newId = Date.now();
    setCustomValues([...customValues, { id: newId, name: "", mapping: [] }]);
    buttonRefs.current = [...buttonRefs.current, React.createRef()];
  };

  const handleValueNameChange = (index, newName) => {
    const updatedCustomValues = customValues.map((customValue, i) =>
      i === index ? { ...customValue, name: newName } : customValue
    );
    setCustomValues(updatedCustomValues);
  };

  const handleAddMapping = (valueIndex) => {
    const availableColumns = groups.filter(
      (group) => getAvailableValues(group).length > 0
    );
    if (availableColumns.length > 0) {
      setCurrentGroupIndex(valueIndex);
      setIsPaneVisible(true);
    } else {
      triggerTooltip(
        "No available values to map from the selected columns.",
        valueIndex
      );
    }
  };

  const handleSelectMapping = (groupColumn, value) => {
    if (currentGroupIndex !== null) {
      const updatedCustomValues = customValues.map((customValue, i) =>
        i === currentGroupIndex
          ? {
            ...customValue,
            mapping: [
              ...customValue.mapping,
              {
                groupColumn,
                value:
                  typeof value === "object"
                    ? {
                      minValue: value.minValue,
                      maxValue: value.maxValue,
                      type: value.type,
                    }
                    : value,
              },
            ],
          }
          : customValue
      );
      setCustomValues(updatedCustomValues);
    }
  };

  const handleRemoveMapping = (valueIndex, mapIndex) => {
    const updatedCustomValues = customValues.map((customValue, i) =>
      i === valueIndex
        ? {
          ...customValue,
          mapping: customValue.mapping.filter((_, mi) => mi !== mapIndex),
        }
        : customValue
    );
    setCustomValues(updatedCustomValues);
  };

  const handleDeleteGroup = (column) => {
    const newGroups = groups.filter((group) => group.column !== column);
    onMappingChange(newGroups);
  };

  const saveMapping = () => {
    onSave(groups, unionName, customValues, removeFromHierarchy, useHotOneMapping);
    setUnionName("");
    setCustomValues([]);
    setUseHotOneMapping(false);
  };

  const triggerTooltip = (message, buttonIndex) => {
    setTooltipRef(buttonRefs.current[buttonIndex]);
    setTooltipMessage(message);
    setTooltipShown(false);
    setTimeout(() => setTooltipShown(true), 10);
  };

  const getAvailableValues = (group) => {
    const columnMappings = customValues.flatMap((customValue) =>
      customValue.mapping
        .filter((map) => map.groupColumn === group.column)
        .map((map) => map.value)
    );

    return group.values.filter(
      (value) => (!columnMappings.includes(value)) ||
        value === "integer" ||
        value === "double" ||
        value === "date"
    );
  };

  const removeValue = (valueIndex) => {
    const updatedCustomValues = customValues.filter((_, i) => i !== valueIndex);
    setCustomValues(updatedCustomValues);
    buttonRefs.current.splice(valueIndex, 1);
  };

  const isSaveDisabled = () => {
    const hasValidName = unionName.trim().length > 0;
    const allValuesHaveNames = customValues.every(
      (customValue) => customValue.name.trim().length > 0
    );
    return !(hasValidName && allValuesHaveNames);
  };

  const extractMinMax = (values, type) => {
    let min = null;
    let max = null;
    values.forEach((value) => {
      if (type === "date") {
        if (value.startsWith("earliest:"))
          min = new Date(value.replace("earliest:", "")).getTime();
        else if (value.startsWith("latest:"))
          max = new Date(value.replace("latest:", "")).getTime();
      } else if (type === "integer" || type === "double") {
        if (value.startsWith("min:"))
          min = parseFloat(value.replace("min:", ""));
        else if (value.startsWith("max:")) {
          max = parseFloat(value.replace("max:", ""));
        }
      }
    });
    return { min, max };
  };

  const getUnavailableRanges = (groupColumn) => {
    const ranges = [];
    customValues.forEach((customValue) => {
      customValue.mapping.forEach((map) => {
        if (map.groupColumn === groupColumn && typeof map.value === "object" && map.value.minValue !== undefined) {
          ranges.push([map.value.minValue, map.value.maxValue]);
        }
      });
    });
    return ranges;
  };

  const formatValue = (value, type) => {
    if (type === "date") {
      const date = new Date(value);
      return date instanceof Date && !isNaN(date)
        ? date.toISOString().split("T")[0]
        : "";
    }
    return value !== undefined && value !== null ? value.toString() : "";
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    resizingRef.current = true;
  };

  const handleMouseMove = useCallback((e) => {
    if (!resizingRef.current || !containerRef.current) return;
    e.preventDefault();
    const containerRect = containerRef.current.getBoundingClientRect();
    let newHeight = e.clientY - containerRect.top;
    const minHeight = 50;
    const maxHeight = containerRect.height - 50;
    if (newHeight < minHeight) newHeight = minHeight;
    if (newHeight > maxHeight) newHeight = maxHeight;
    setDropAreaHeight(newHeight);
  }, []);

  const handleMouseUp = useCallback(() => {
    resizingRef.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div className={ColumnMappingStyles.mappingSection} ref={containerRef}>
      <div
        className={ColumnMappingStyles.dropArea}
        style={{ height: dropAreaHeight }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {groups.length === 0 && (
          <span className={ColumnMappingStyles.dropText}>
            Click or drop columns here
          </span>
        )}
        {groups.map((group, index) => (
          <div key={index} className={ColumnMappingStyles.droppedItem}>
            <div className={ColumnMappingStyles.groupHeader}>
              <span
                className={ColumnMappingStyles.deleteIcon}
                onClick={() => handleDeleteGroup(group.column)}
              >
                <CloseIcon />
              </span>
              <h4 className={ColumnMappingStyles.groupTitle}>
                <span className={ColumnMappingStyles.columnName}>
                  {group.column}
                </span>
              </h4>
              <div className={ColumnMappingStyles.groupTypeFileWrapper}>
                <span className={ColumnMappingStyles.groupType}>
                  Type:{" "}
                  {group.values.includes("integer")
                    ? "Integer"
                    : group.values.includes("double")
                      ? "Double"
                      : group.values.includes("date")
                        ? "Date"
                        : "Categorical"}
                </span>
                <em className={ColumnMappingStyles.groupFile}>
                  from {group.fileName}
                </em>
              </div>
            </div>
            <div className={ColumnMappingStyles.groupContent}>
              {group.values.includes("integer") ||
                group.values.includes("double") ? (
                <p className={ColumnMappingStyles.groupDetail}>
                  This column represents numerical data.
                </p>
              ) : group.values.includes("date") ? (
                <p className={ColumnMappingStyles.groupDetail}>
                  This column represents date values.
                </p>
              ) : (
                <div>
                  <p className={ColumnMappingStyles.groupDetail}>Categories:</p>
                  <ul className={ColumnMappingStyles.categoryList}>
                    {group.values.map((value, valueIndex) => (
                      <li
                        key={valueIndex}
                        className={ColumnMappingStyles.categoryItem}
                      >
                        {value}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        className={ColumnMappingStyles.resizer}
        onMouseDown={handleMouseDown}
      />

      <div className={ColumnMappingStyles.createEntrySection}>
        <div className={ColumnMappingStyles.entryHeaderRow}>



          <div className={ColumnMappingStyles.removeCheckbox}>
            <label title="Remove columns">
              <Switch
                checked={removeFromHierarchy}
                onChange={(checked) => setRemoveFromHierarchy(checked)}
                height={20}
                width={40}
                handleDiameter={16}
                offColor="#888"
                onColor="#9ABDDC"
              />
              <span className={ColumnMappingStyles.switchLabel}>Remove columns</span>
            </label>
          </div>

          <div className={ColumnMappingStyles.mappingTypeSelector}>
            <label title="One-Hot">
              <Switch
                checked={useHotOneMapping}
                onChange={(checked) => setUseHotOneMapping(checked)}
                height={20}
                width={40}
                handleDiameter={16}
                offColor="#888"
                onColor="#9ABDDC"
              />
              <span className={ColumnMappingStyles.switchLabel}>One-Hot</span>
            </label>
          </div>
          <AutocompleteInput
            value={unionName}
            onChange={handleUnionNameChange}
            placeholder="Enter a name for the custom column"
            className={ColumnMappingStyles.unionInput}
            suggestions={unionInputSuggestions}
          />
          <div className={ColumnMappingStyles.buttonsAndCheckbox}>
            <button
              onClick={addNewValue}
              className={ColumnMappingStyles.addValueButton}
              title="Add Value"
            >
              <span className={ColumnMappingStyles.buttonText}>Add Value</span>

              <span className={ColumnMappingStyles.iconWrapper}>
                <AddIcon fontSize="inherit" className={ColumnMappingStyles.buttonIcon} />
              </span>

            </button>
            <button
              onClick={saveMapping}
              className={ColumnMappingStyles.saveButton}
              disabled={isSaveDisabled()}
              title="Save Mapping"
            >
              <span className={ColumnMappingStyles.buttonText}>Save</span>
              <span className={ColumnMappingStyles.iconWrapper}>
                <SaveIcon fontSize="inherit" className={ColumnMappingStyles.buttonIcon} />
              </span>
            </button>
          </div>

        </div>

        <div
          ref={paneRef}
          className={`${ColumnMappingStyles.slidingPane} ${isPaneVisible ? ColumnMappingStyles.paneVisible : ""
            }`}
        >
          {currentGroupIndex !== null && (
            <div className={ColumnMappingStyles.selectMappingContainer}>
              <div className={ColumnMappingStyles.selectMappingHeader}>
                <h5>Select Value to Map</h5>
                <button
                  onClick={() => {
                    setCurrentGroupIndex(null);
                    setIsPaneVisible(false);
                  }}
                  className={ColumnMappingStyles.closeIconButton}
                >
                  <CloseIcon />
                </button>
              </div>
              {groups.map((group, index) => {
                const darkenedColor = darkenColor(group.color, -30);
                const firstValueType = group.values[0];
                const { min, max } = extractMinMax(group.values, firstValueType);
                const unavailableRanges = getUnavailableRanges(group.column);
                const availableValues = getAvailableValues(group);
                const allMapped = availableValues.length === 0;
                return (
                  <div key={index} className={ColumnMappingStyles.mappingGroup}>
                    <div
                      className={ColumnMappingStyles.columnTitle}
                      style={{ color: darkenedColor }}
                    >
                      {group.column}
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
                          handleSelectMapping(group.column, {
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
                              onClick={() =>
                                handleSelectMapping(group.column, value)
                              }
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
          )}
        </div>

        <TransitionGroup className={ColumnMappingStyles.valueListContainer}>
          {customValues.map((customValue, index) => {
            if (!mappingRefs.current[customValue.id])
              mappingRefs.current[customValue.id] = React.createRef();
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
                <div ref={mappingRefs.current[customValue.id]} className={ColumnMappingStyles.valueMappingContainer}>
                  <div className={ColumnMappingStyles.valueMappingRow}>
                    <AutocompleteInput
                      value={customValue.name}
                      onChange={(val) => handleValueNameChange(index, val)}
                      placeholder="Value name"
                      className={ColumnMappingStyles.valueNameInput}
                      suggestions={unionEnumSuggestions}
                    />
                    {isTooltipShown && tooltipRef && (
                      <TooltipPopup
                        message={tooltipMessage}
                        buttonRef={tooltipRef}
                        onClose={() => setTooltipShown(false)}
                      />
                    )}
                    <button
                      ref={buttonRefs.current[index]}
                      onClick={() => {
                        if (groups.length <= 0) {
                          triggerTooltip("No set elements to get the values from.", index);
                        } else {
                          handleAddMapping(index);
                        }
                      }}
                      className={ColumnMappingStyles.addMappingButton}
                    >
                      Add Mapping
                    </button>
                    {customValue.mapping.length > 0 && (
                      <div className={ColumnMappingStyles.mappingSummary}>
                        <span>{customValue.mapping.length} values from</span>
                        <span>
                          {new Set(customValue.mapping.map((m) => m.groupColumn)).size}{" "}
                          columns mapped
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => removeValue(index)}
                      className={ColumnMappingStyles.closeIconButton}
                    >
                      <CloseIcon />
                    </button>
                  </div>
                  <ul className={ColumnMappingStyles.currentMappings}>
                    {customValue.mapping.map((map, mapIndex) => {
                      const columnName = map.groupColumn;
                      const displayVal =
                        typeof map.value === "object" && map.value.minValue !== undefined
                          ? `${formatValue(map.value.minValue, map.value.type)} - ${formatValue(
                            map.value.maxValue,
                            map.value.type
                          )}`
                          : map.value;

                      return (
                        <li key={mapIndex} className={ColumnMappingStyles.mappedItem}>
                          <div className={ColumnMappingStyles.mappedRow}>
                            <span className={ColumnMappingStyles.mappedLabel}>
                              From {columnName}:
                            </span>
                            <span className={ColumnMappingStyles.mappedValue}>{displayVal}</span>
                            <button
                              className={ColumnMappingStyles.closeIconButton}
                              onClick={() => handleRemoveMapping(index, mapIndex)}
                            >
                              <CloseIcon />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>


                </div>
              </CSSTransition>
            )
          })}
        </TransitionGroup>
      </div>
    </div>
  );
}

export default ColumnMapping;