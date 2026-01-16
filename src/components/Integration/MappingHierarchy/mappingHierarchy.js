import React, { useState, useEffect, useRef } from "react";
import CloseIcon from "@mui/icons-material/Close";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
import CheckIcon from "@mui/icons-material/Check";
import MappingHierarchyStyles from "./mappingHierarchy.module.css";
import EditIcon from "@mui/icons-material/Edit";

// Display for the mappings declared, contains all columns that will be present in mapped files and their value groupings 
function MappingHierarchy({ mappingIndex, mappingKey, mapping, columnsData, onDeleteMapping, formatValue, onUpdateMapping }) {
  const [editing, setEditing] = useState({ type: null, groupIndex: null, valueIndex: null });
  const [editText, setEditText] = useState("");
  const editRef = useRef();
  const { mappingType, fileName, groups } = mapping;

  useEffect(() => {
    if (editing.type && editRef.current)
      editRef.current.focus();
  }, [editing]);

  const getSourceColor = (map) => {
    const col = columnsData.find(
      (c) =>
        c.column === map.groupColumn &&
        c.fileName === map.fileName &&
        c.nodeId === map.nodeId
    );

    return (
      col?.color ||
      columnsData.find((c) => c.column === map.groupColumn)?.color ||
      "#ccc"
    );
  };

  const handleEdit = (type, groupIndex, valueIndex, currentText = "") => {
    setEditing({ type, groupIndex, valueIndex });
    setEditText(currentText);
  };

  const cancelEdit = () => {
    setEditing({ type: null, groupIndex: null, valueIndex: null });
  };

  const saveEdit = () => {
    const { groupIndex, valueIndex, type } = editing;

    if (type === "valueName") {
      const oldValueName = mapping.groups[groupIndex].values[valueIndex].name;

      const updatedGroups = mapping.groups.map((group, gIdx) => {
        if (gIdx !== groupIndex) return group;
        return {
          ...group,
          values: group.values.map((val, vIdx) => {
            if (vIdx !== valueIndex) return val;
            const updatedMapping = val.mapping.map((m) => {
              if (m.value === oldValueName)
                return { ...m, value: editText };
              return m;
            });

            return {
              ...val,
              name: editText,
              mapping: updatedMapping,
            };
          }),
        };
      });
      const updatedMapping = { ...mapping, groups: updatedGroups };
      onUpdateMapping(mappingIndex, mappingKey, updatedMapping);
    }

    else if (type === "columnTitle") {
      // Renaming column will also update groupColumn references to this column
      const updatedGroups = mapping.groups.map((group) => ({
        ...group,
        values: group.values.map((val) => ({
          ...val,
          mapping: val.mapping.map((m) =>
            m.groupColumn === mappingKey ? { ...m, groupColumn: editText } : m
          ),
        })),
      }));

      const updatedMapping = { ...mapping, groups: updatedGroups };
      onUpdateMapping(mappingIndex, mappingKey, updatedMapping, editText);
    }

    cancelEdit();
  };

  const renderValueBoxes = () => {
    if (!groups?.length) return null;

    return groups.map((group, gIndex) => (
      <div key={gIndex} className={MappingHierarchyStyles.valueContainer}>
        {group.values.map((valueObj, valIndex) => {
          const fileColors = [
            ...new Set(valueObj.mapping.map((m) => getSourceColor(m))),
          ];


          const singleColor = fileColors.length === 1 ? fileColors[0] : null;
          const showPerColumnColor = fileColors.length > 1;
          const isEditing = editing.type === "valueName" && editing.groupIndex === gIndex && editing.valueIndex === valIndex;

          const renderValueName = () => {
            if (isEditing) {
              return (
                <div className={MappingHierarchyStyles.editingValueWrapper}>
                  <div className={MappingHierarchyStyles.editingInputGroup}>
                    <input
                      ref={editRef}
                      className={MappingHierarchyStyles.inlineInput}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      onBlur={cancelEdit}
                    />
                  </div>
                  <div className={MappingHierarchyStyles.editingControls}>
                    <CheckIcon className={MappingHierarchyStyles.checkIcon} onClick={saveEdit} />
                  </div>
                </div>
              );
            }

            return (
              <div
                className={MappingHierarchyStyles.editableHover}
                onDoubleClick={() => {
                  if (mappingType === "standard") {
                    handleEdit("valueName", gIndex, valIndex, valueObj.name);
                  }
                }}
              >
                <span>{mappingType === "one-hot"
                  ? valueObj.name === "1"
                    ? "Presence (1)"
                    : "Absence (0)"
                  : valueObj.name}</span>

                {mappingType === "standard" && (
                  <EditIcon className={MappingHierarchyStyles.editIcon} />
                )}
              </div>
            );
          };

          const renderMappingLines = () => {
            return valueObj.mapping.map((map, mapIndex) => {
              const isValueObject = typeof map.value === "object" && map.value !== null;
              const formattedValue = isValueObject
                ? `${formatValue(map.value.minValue, map.value.type)} - ${formatValue(
                  map.value.maxValue,
                  map.value.type
                )}`
                : map.value;

              if (map.groupColumn === mappingKey && map.value === valueObj.name)
                return null;

              const columnColor = getSourceColor(map);

              return (
                <div key={mapIndex} className={MappingHierarchyStyles.mappingItem}>
                  <div className={MappingHierarchyStyles.mappingColumn}>
                    {showPerColumnColor && (
                      <span
                        className={MappingHierarchyStyles.entryIndicator}
                        style={{ backgroundColor: columnColor }}
                      />
                    )}
                    <span>{map.groupColumn}</span>
                  </div>
                  <ArrowRightAltIcon className={MappingHierarchyStyles.arrowIcon} />
                  <span>{formattedValue}</span>
                </div>
              );
            });
          };

          if (mappingType === "one-hot" && valueObj.name === "0") {
            return (
              <div key={valIndex} className={MappingHierarchyStyles.valueBox}>
                <div className={MappingHierarchyStyles.valueName}>
                  {renderValueName()}
                  {singleColor && (
                    <span
                      className={MappingHierarchyStyles.entryIndicator}
                      style={{ backgroundColor: singleColor }}
                    />
                  )}
                </div>
                <div className={MappingHierarchyStyles.mappingItem}>
                  <span>Rest of values</span>
                </div>
              </div>
            );
          }

          return (
            <div key={valIndex} className={MappingHierarchyStyles.valueBox}>
              <div className={MappingHierarchyStyles.valueName}>
                {renderValueName()}
                {singleColor && (
                  <span
                    className={MappingHierarchyStyles.entryIndicator}
                    style={{ backgroundColor: singleColor }}
                  />
                )}
              </div>
              <div className={MappingHierarchyStyles.mappings}>
                {renderMappingLines()}
              </div>
            </div>
          );
        })}
      </div>
    ));
  };

  return (
    <div className={`${MappingHierarchyStyles.entryContainer} ${editing.type ? MappingHierarchyStyles.editing : ''}`}>
      <div className={MappingHierarchyStyles.headerRow}>
        {editing.type === "columnTitle" && mappingType === "standard" ? (
          <div className={MappingHierarchyStyles.inlineEditWrapper}>
            <input
              ref={editRef}
              className={MappingHierarchyStyles.inlineInput}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              onBlur={cancelEdit}
            />
            <CheckIcon className={MappingHierarchyStyles.checkIcon} onClick={saveEdit} />
          </div>
        ) : (
          <div
            className={MappingHierarchyStyles.editableHover}
            onDoubleClick={() => {
              if (mappingType === "standard") {
                handleEdit("columnTitle", null, null, mappingKey);
              }
            }}
          >
            <h4>{mappingKey}</h4>
            {mappingType === "standard" && (
              <EditIcon className={MappingHierarchyStyles.editIcon} />
            )}
          </div>
        )}
      </div>

      <div className={MappingHierarchyStyles.fileName}>
        <em>{fileName}</em>
      </div>
      <div
        className={MappingHierarchyStyles.deleteIcon}
        onClick={() => onDeleteMapping(mappingIndex, mappingKey)}
      >
        <CloseIcon />
      </div>
      <div className={MappingHierarchyStyles.groupContainer}>
        {renderValueBoxes()}
      </div>
    </div>
  );
}

export default MappingHierarchy;
