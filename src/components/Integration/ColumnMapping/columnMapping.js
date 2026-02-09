import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import ColumnMappingStyles from "./columnMapping.module.css";
import Switch from "react-switch";
import DescriptionModal from "../DescriptionModal/descriptionModal.js";
import TooltipPopup from "../../Common/TooltipPopup/tooltipPopup.js";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DescriptionIcon from "@mui/icons-material/Description";
import AutocompleteInput from "../../Common/AutoCompleteInput/autoCompleteInput.js";
import { fetchSuggestions } from "../../../util/petitionHandler";
import debounce from "lodash/debounce";
import DroppedColumnsList from "./DroppedColumnsList.js";
import MappingSelectorPane from "./MappingSelectorPane.js";
import ValuesList from "./ValuesList.js";

// Main control area for defining mappings in data integration
function ColumnMapping({ onMappingChange, onSave, groups, schema, loadedDraft }) {
  const [unionName, setUnionName] = useState("");
  const [unionTerminology, setUnionTerminology] = useState("");

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
  const saveButtonRef = useRef(null);
  const [saveTooltipShown, setSaveTooltipShown] = useState(false);
  const [saveTooltipMessage, setSaveTooltipMessage] = useState("");

  const [snomedUnionTerminologySuggestions, setSnomedUnionTerminologySuggestions] = useState([]);
  const [snomedValueTerminologySuggestions, setSnomedValueTerminologySuggestions] = useState({});

  const [showHeaderTooltip, setShowHeaderTooltip] = useState(false);
  const headerTooltipButtonRef = useRef(null);

  const getGroupKey = (g) => `${g.nodeId}::${g.fileName}::${g.column}`;

  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [descriptionItems, setDescriptionItems] = useState([]);
  const [activeDescriptionIndex, setActiveDescriptionIndex] = useState(0);

  const [unionDescription, setUnionDescription] = useState("");
  const [valueDescriptions, setValueDescriptions] = useState({}); // { [customValueId]: string }

  const openDescriptionModalAt = (index) => {
    setActiveDescriptionIndex(index);
    setIsDescriptionOpen(true);
  };

  const closeDescriptionModal = () => setIsDescriptionOpen(false);

  useEffect(() => {
    if (!loadedDraft) return;

    setUnionName(loadedDraft.unionName || "");
    setUnionTerminology(loadedDraft.unionTerminology || "");
    setUnionDescription(loadedDraft.unionDescription || "");
    setUseHotOneMapping(!!loadedDraft.useHotOneMapping);
    setRemoveFromHierarchy(!!loadedDraft.removeFromHierarchy);
    setValueDescriptions(loadedDraft.valueDescriptions || {});
    onMappingChange?.(loadedDraft.groups || []);
    setCustomValues(loadedDraft.customValues || []);
    buttonRefs.current = (loadedDraft.customValues || []).map(() => React.createRef());
    setIsPaneVisible(false);
    setCurrentGroupIndex(null);
  }, [loadedDraft, onMappingChange]);

  const getActiveDescriptionValue = () => {
    const item = descriptionItems[activeDescriptionIndex];
    if (!item) return "";
    if (item.kind === "union") return unionDescription || "";
    return valueDescriptions[item.id] || "";
  };

  const setActiveDescriptionValue = (nextText) => {
    const item = descriptionItems[activeDescriptionIndex];
    if (!item) return;

    if (item.kind === "union") {
      setUnionDescription(nextText);
    } else {
      setValueDescriptions((prev) => ({ ...prev, [item.id]: nextText }));
    }
  };

  const goPrevDescription = () => {
    setActiveDescriptionIndex((i) => Math.max(0, i - 1));
  };

  const goNextDescription = () => {
    setActiveDescriptionIndex((i) => Math.min(descriptionItems.length - 1, i + 1));
  };

  const containerRef = useRef(null);
  const resizingRef = useRef(false);

  const parsedSchema = useMemo(() => {
    if (schema && typeof schema === "string") {
      try {
        return JSON.parse(schema);
      } catch {
        return null;
      }
    }
    return schema;
  }, [schema]);

  const unionNameSuggestions = useMemo(() => {
    if (parsedSchema && parsedSchema.properties) return Object.keys(parsedSchema.properties);
    return [];
  }, [parsedSchema]);

  const unionEnumSuggestions = useMemo(() => {
    if (parsedSchema && parsedSchema.properties && unionName) {
      const matchingKey = Object.keys(parsedSchema.properties).find(
        (key) => key.toLowerCase() === unionName.toLowerCase()
      );
      if (matchingKey && parsedSchema.properties[matchingKey]?.enum) {
        return parsedSchema.properties[matchingKey].enum;
      }
    }
    return [];
  }, [parsedSchema, unionName]);

  const debouncedFetchSnomedTerminology = useMemo(
    () =>
      debounce(async (q, key) => {
        try {
          const res = await fetchSuggestions(q, "snomed");
          const enriched = (res || []).map((s) => {
            const code = s.iri?.split("/").pop();
            return { label: s.label, value: `${s.label} | ${code}` };
          });

          if (key === "unionTerminology") {
            setSnomedUnionTerminologySuggestions(enriched);
          } else {
            setSnomedValueTerminologySuggestions((prev) => ({ ...prev, [key]: enriched }));
          }
        } catch {
          if (key === "unionTerminology") {
            setSnomedUnionTerminologySuggestions([]);
          } else {
            setSnomedValueTerminologySuggestions((prev) => ({ ...prev, [key]: [] }));
          }
        }
      }, 300),
    []
  );

  const handleDrop = (e) => {
    e.preventDefault();

    const droppedData = e.dataTransfer.getData("column");
    if (!droppedData) return;

    let droppedColumn;
    try {
      droppedColumn = JSON.parse(droppedData);
    } catch {
      return;
    }

    const alreadyExists = groups.some(
      (group) =>
        group.column === droppedColumn.column &&
        group.fileName === droppedColumn.fileName &&
        group.nodeId === droppedColumn.nodeId
    );

    if (!alreadyExists) {
      onMappingChange([...groups, droppedColumn]);
    }
  };

  const handleUnionNameChange = (val) => {
    setUnionName(val);
  };

  const unionTerminologySuggestionLabels = useMemo(() => {
    const schemaList = unionNameSuggestions || [];
    const snomedList = (snomedUnionTerminologySuggestions || []).map((s) => s.label);

    const schemaSet = new Set(schemaList.map((x) => x.toLowerCase()));
    const snomedAppended = snomedList.filter((x) => !schemaSet.has(x.toLowerCase()));
    return [...schemaList, ...snomedAppended];
  }, [unionNameSuggestions, snomedUnionTerminologySuggestions]);

  const handleUnionTerminologyChange = (raw) => {
    const hit = (snomedUnionTerminologySuggestions || []).find(
      (s) => s.value === raw || s.label === raw
    );
    const next = hit ? hit.value : raw;
    setUnionTerminology(next);

    const query = raw?.trim();
    if (query && query.length > 2) debouncedFetchSnomedTerminology(query, "unionTerminology");
    else setSnomedUnionTerminologySuggestions([]);
  };

  const addNewValue = () => {
    const newId = Date.now();
    setCustomValues((prev) => [...prev, { id: newId, name: "", snomedTerm: "", mapping: [] }]);
    buttonRefs.current = [...buttonRefs.current, React.createRef()];
  };

  const handleValueSnomedChange = (customValueId, newTerm) => {
    setCustomValues((prev) =>
      prev.map((cv) => (cv.id === customValueId ? { ...cv, snomedTerm: newTerm } : cv))
    );

    const query = newTerm?.trim();
    if (query && query.length > 2) debouncedFetchSnomedTerminology(query, customValueId);
    else setSnomedValueTerminologySuggestions((prev) => ({ ...prev, [customValueId]: [] }));
  };

  const handleValueNameChange = (customValueId, newName) => {
    setCustomValues((prev) =>
      prev.map((cv) => (cv.id === customValueId ? { ...cv, name: newName } : cv))
    );
  };

  const handleAddMapping = (valueIndex) => {
    const availableColumns = groups.filter((group) => getAvailableValues(group).length > 0);
    if (availableColumns.length > 0) {
      setCurrentGroupIndex(valueIndex);
      setIsPaneVisible(true);
    } else {
      triggerTooltip("No available values to map from the selected columns.", valueIndex);
    }
  };

  const handleSelectMapping = (group, value) => {
    const groupKey = getGroupKey(group);

    if (currentGroupIndex !== null) {
      setCustomValues((prev) =>
        prev.map((cv, i) =>
          i === currentGroupIndex
            ? {
                ...cv,
                mapping: [
                  ...cv.mapping,
                  {
                    groupKey,
                    groupColumn: group.column,
                    fileName: group.fileName,
                    nodeId: group.nodeId,
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
            : cv
        )
      );
    }
  };

  const handleRemoveMapping = (valueIndex, mapIndex) => {
    setCustomValues((prev) =>
      prev.map((cv, i) =>
        i === valueIndex ? { ...cv, mapping: cv.mapping.filter((_, mi) => mi !== mapIndex) } : cv
      )
    );
  };

  const handleDeleteGroup = (groupToDelete) => {
    const newGroups = groups.filter(
      (group) =>
        !(
          group.column === groupToDelete.column &&
          group.fileName === groupToDelete.fileName &&
          group.nodeId === groupToDelete.nodeId
        )
    );
    onMappingChange(newGroups);
  };

  const getSaveValidationError = () => {
    if (unionName.trim().length === 0) return "Please set a new column name.";
    if (customValues.length === 0) return "Please add at least one value.";
    const unnamedIndex = customValues.findIndex((cv) => cv.name.trim().length === 0);
    if (unnamedIndex !== -1) return `Value #${unnamedIndex + 1} has no contents.`;

    const unmappedIndex = customValues.findIndex((cv) => !cv.mapping || cv.mapping.length === 0);
    if (unmappedIndex !== -1) {
      const cv = customValues[unmappedIndex];
      const label = cv?.name?.trim() ? `"${cv.name.trim()}"` : `#${unmappedIndex + 1}`;
      return `Value ${label} has no mappings. Add at least one mapping or remove the value.`;
    }

    return "";
  };

  const saveMapping = () => {
    const err = getSaveValidationError();
    if (err) {
      triggerSaveTooltip(err);
      return;
    }

    const cleanedCustomValues = customValues.map(({ id, snomedTerm, name, mapping }) => ({
      id,
      name,
      mapping,
      terminology: snomedTerm || "",
      description: valueDescriptions[id] || "",
    }));

    const unionMeta = {
      terminology: unionTerminology || "",
      description: unionDescription || "",
    };

    onSave(groups, unionName, cleanedCustomValues, removeFromHierarchy, useHotOneMapping, unionMeta);
    setSaveTooltipShown(false);
    setUnionName("");
    setUnionTerminology("");
    setUnionDescription("");
    setValueDescriptions({});
    setCustomValues([]);
    setUseHotOneMapping(false);
  };

  const triggerTooltip = (message, buttonIndex) => {
    setTooltipRef(buttonRefs.current[buttonIndex]);
    setTooltipMessage(message);
    setTooltipShown(false);
    setTimeout(() => setTooltipShown(true), 10);
  };

  const triggerSaveTooltip = (message) => {
    setSaveTooltipMessage(message);
    setSaveTooltipShown(false);
    setTimeout(() => setSaveTooltipShown(true), 10);
  };

  const getAvailableValues = (group) => {
    const groupKey = getGroupKey(group);

    const columnMappings = customValues.flatMap((customValue) =>
      customValue.mapping.filter((map) => map.groupKey === groupKey).map((map) => map.value)
    );

    return group.values.filter(
      (value) =>
        !columnMappings.includes(value) ||
        value === "integer" ||
        value === "double" ||
        value === "date"
    );
  };

  const removeValue = (valueIndex) => {
    setCustomValues((prev) => prev.filter((_, i) => i !== valueIndex));
    buttonRefs.current.splice(valueIndex, 1);
  };

  const isSaveDisabled = () => {
    const hasValidName = unionName.trim().length > 0;
    const hasAtLeastOneValue = customValues.length > 0;
    const allValuesNamed = hasAtLeastOneValue && customValues.every((cv) => cv.name.trim().length > 0);
    const allValuesMapped = hasAtLeastOneValue && customValues.every((cv) => (cv.mapping?.length ?? 0) > 0);
    return !(hasValidName && hasAtLeastOneValue && allValuesNamed && allValuesMapped);
  };

  const extractMinMax = (values, type) => {
    let min = null;
    let max = null;
    values.forEach((value) => {
      if (type === "date") {
        if (value.startsWith("earliest:")) min = new Date(value.replace("earliest:", "")).getTime();
        else if (value.startsWith("latest:")) max = new Date(value.replace("latest:", "")).getTime();
      } else if (type === "integer" || type === "double") {
        if (value.startsWith("min:")) min = parseFloat(value.replace("min:", ""));
        else if (value.startsWith("max:")) max = parseFloat(value.replace("max:", ""));
      }
    });
    return { min, max };
  };

  const getUnavailableRanges = (group) => {
    const groupKey = getGroupKey(group);
    const ranges = [];

    customValues.forEach((customValue) => {
      customValue.mapping.forEach((map) => {
        if (map.groupKey === groupKey && typeof map.value === "object" && map.value.minValue !== undefined) {
          ranges.push([map.value.minValue, map.value.maxValue]);
        }
      });
    });

    return ranges;
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (paneRef.current && !paneRef.current.contains(event.target)) {
        setIsPaneVisible(false);
        setCurrentGroupIndex(null);
      }
    };
    if (isPaneVisible) document.addEventListener("mousedown", handleClickOutside);
    else document.removeEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPaneVisible]);

  const currentValueName =
    currentGroupIndex !== null && customValues[currentGroupIndex] ? customValues[currentGroupIndex].name || "" : "";

  const valueContentSuggestions = useMemo(() => unionEnumSuggestions || [], [unionEnumSuggestions]);
  const valueTerminologySuggestionLabelsFor = useCallback(
    (customValueId) => {
      const schemaList = unionEnumSuggestions || [];
      const snomedList = (snomedValueTerminologySuggestions[customValueId] || []).map((s) => s.label);

      const schemaSet = new Set(schemaList.map((x) => x.toLowerCase()));
      const snomedAppended = snomedList.filter((x) => !schemaSet.has(x.toLowerCase()));
      return [...schemaList, ...snomedAppended];
    },
    [unionEnumSuggestions, snomedValueTerminologySuggestions]
  );

  const isLockedNumericValue = useCallback((cv) => {
    const vals = (cv?.mapping || []).map((m) => m?.value);
    if (!vals.length) return false;
    return vals.every((v) => typeof v === "string" && (v === "integer" || v === "double"));
  }, []);

  return (
    <div className={ColumnMappingStyles.mappingSection} ref={containerRef}>
      <DescriptionModal
        isOpen={isDescriptionOpen}
        closeModal={closeDescriptionModal}
        items={descriptionItems}
        activeIndex={activeDescriptionIndex}
        value={getActiveDescriptionValue()}
        onChange={setActiveDescriptionValue}
        onPrev={goPrevDescription}
        onNext={goNextDescription}
      />

      <DroppedColumnsList
        groups={groups}
        onDeleteGroup={handleDeleteGroup}
        onDrop={handleDrop}
        height={dropAreaHeight}
      />

      <div className={ColumnMappingStyles.resizer} onMouseDown={handleMouseDown} />

      <div className={ColumnMappingStyles.createEntrySection}>
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
            onChange={(raw) => handleUnionNameChange(raw)}
            placeholder="New column's name"
            className={ColumnMappingStyles.unionInput}
            suggestions={unionNameSuggestions}
          />

          <AutocompleteInput
            value={unionTerminology}
            onChange={(raw) => {
              const hit = (snomedUnionTerminologySuggestions || []).find((s) => s.value === raw || s.label === raw);
              handleUnionTerminologyChange(hit ? hit.value : raw);
            }}
            placeholder="Column's terminology"
            className={ColumnMappingStyles.snomedInput}
            suggestions={unionTerminologySuggestionLabels}
          />

          <button
            type="button"
            className={ColumnMappingStyles.descriptionButton}
            onClick={() => {
              const items = [
                { kind: "union", label: unionName, index: 0 },
                ...customValues.map((cv, i) => ({
                  kind: "value",
                  id: cv.id,
                  label: cv.name,
                  index: i,
                })),
              ];
              setDescriptionItems(items);
              openDescriptionModalAt(0);
            }}
          >
            <span className={ColumnMappingStyles.buttonText}>Description</span>
            <span className={ColumnMappingStyles.iconWrapper}>
              <DescriptionIcon fontSize="inherit" className={ColumnMappingStyles.buttonIcon} />
            </span>
          </button>

          <button onClick={addNewValue} className={ColumnMappingStyles.addValueButton} title="Add Value">
            <span className={ColumnMappingStyles.buttonText}>Add Value</span>
            <span className={ColumnMappingStyles.iconWrapper}>
              <AddIcon fontSize="inherit" className={ColumnMappingStyles.buttonIcon} />
            </span>
          </button>
        </div>

        <MappingSelectorPane
          isPaneVisible={isPaneVisible && currentGroupIndex !== null}
          currentValueName={currentValueName}
          groups={groups}
          getGroupKey={getGroupKey}
          extractMinMax={extractMinMax}
          getUnavailableRanges={getUnavailableRanges}
          getAvailableValues={getAvailableValues}
          onSelectMapping={handleSelectMapping}
          onClose={() => {
            setCurrentGroupIndex(null);
            setIsPaneVisible(false);
          }}
          paneRef={paneRef}
        />

        <ValuesList
          customValues={customValues}
          groups={groups}
          valueContentSuggestions={valueContentSuggestions}
          valueTerminologySuggestionLabelsFor={valueTerminologySuggestionLabelsFor}
          snomedValueTerminologySuggestions={snomedValueTerminologySuggestions}
          isTooltipShown={isTooltipShown}
          tooltipRef={tooltipRef}
          tooltipMessage={tooltipMessage}
          onTooltipClose={() => setTooltipShown(false)}
          onValueNameChange={handleValueNameChange}
          onValueSnomedChange={handleValueSnomedChange}
          onAddMapping={(index) => {
            if (groups.length <= 0) {
              triggerTooltip("No set elements to get the values from.", index);
            } else {
              handleAddMapping(index);
            }
          }}
          onRemoveMapping={handleRemoveMapping}
          onRemoveValue={removeValue}
          onOpenDescription={(index) => {
            const items = [
              { kind: "union", label: unionName, index: 0 },
              ...customValues.map((cv, i) => ({
                kind: "value",
                id: cv.id,
                label: cv.name,
                index: i,
              })),
            ];
            setDescriptionItems(items);
            openDescriptionModalAt(index + 1);
          }}
          isLockedNumericValue={isLockedNumericValue}
          buttonRefs={buttonRefs}
        />

        <div className={ColumnMappingStyles.bottomControlsRow}>
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

          <button
            onClick={saveMapping}
            className={`${ColumnMappingStyles.saveButton} ${
              isSaveDisabled() ? ColumnMappingStyles.saveButtonDisabled : ""
            }`}
            aria-disabled={isSaveDisabled()}
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
              onClose={() => setSaveTooltipShown(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ColumnMapping;
