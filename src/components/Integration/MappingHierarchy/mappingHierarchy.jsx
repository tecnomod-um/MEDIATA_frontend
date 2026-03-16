import React, { useState, useEffect, useRef, useMemo } from "react";
import CloseIcon from "@mui/icons-material/Close";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
import CheckIcon from "@mui/icons-material/Check";
import EditIcon from "@mui/icons-material/Edit";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import IconButton from "@mui/material/IconButton";
import Popper from "@mui/material/Popper";
import Paper from "@mui/material/Paper";
import ClickAwayListener from "@mui/material/ClickAwayListener";

import MappingHierarchyStyles from "./mappingHierarchy.module.css";

function MappingHierarchy({ mappingIndex, mappingKey, mapping, columnsData, onDeleteMapping, formatValue, onUpdateMapping, autoOpen = false, onSelect }) {
  const [editing, setEditing] = useState({ type: null, groupIndex: null, valueIndex: null });
  const [editText, setEditText] = useState("");
  const [isOpen, setIsOpen] = useState(!!autoOpen);
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaAnchorEl, setMetaAnchorEl] = useState(null);
  const [metaPayload, setMetaPayload] = useState({ title: "", terminology: "", description: "" });

  const editRef = useRef();
  const savingRef = useRef(false);

  const { mappingType, fileName, groups } = mapping;
  const hasColumnMeta = !!(mapping?.terminology?.trim() || mapping?.description?.trim());

  const closeMeta = () => {
    setMetaOpen(false);
    setMetaAnchorEl(null);
  };

  const openMeta = (evt, payload) => {
    const sameAnchor = metaAnchorEl && evt?.currentTarget === metaAnchorEl;
    if (metaOpen && sameAnchor) {
      closeMeta();
      return;
    }
    setMetaAnchorEl(evt.currentTarget);
    setMetaPayload(payload);
    setMetaOpen(true);
  };

  useEffect(() => {
    if (metaOpen && metaAnchorEl && !document.body.contains(metaAnchorEl)) closeMeta();
  }, [metaOpen, metaAnchorEl]);

  useEffect(() => {
    if (editing.type && editRef.current) editRef.current.focus();
  }, [editing]);

  useEffect(() => {
    if (autoOpen) setIsOpen(true);
  }, [autoOpen]);

  const getSourceColor = (map) => {
    const col = columnsData.find(
      (c) => c.column === map.groupColumn && c.fileName === map.fileName && c.nodeId === map.nodeId
    );
    return col?.color || columnsData.find((c) => c.column === map.groupColumn)?.color || "#ccc";
  };

  const handleEdit = (type, groupIndex, valueIndex, currentText = "") => {
    if (!isOpen) setIsOpen(true);
    setEditing({ type, groupIndex, valueIndex });
    setEditText(currentText);
    closeMeta();
  };

  const cancelEdit = () => {
    setEditing({ type: null, groupIndex: null, valueIndex: null });
  };

  const saveEdit = () => {
    savingRef.current = true;
    const { groupIndex, valueIndex, type } = editing;

    if (type === "valueName") {
      const oldValueName = mapping.groups[groupIndex].values[valueIndex].name;

      const updatedGroups = mapping.groups.map((group, gIdx) => {
        if (gIdx !== groupIndex) return group;
        return {
          ...group,
          values: group.values.map((val, vIdx) => {
            if (vIdx !== valueIndex) return val;

            const updatedMapping = (val.mapping || []).map((m) => {
              if (m.value === oldValueName) return { ...m, value: editText };
              return m;
            });

            return { ...val, name: editText, mapping: updatedMapping };
          }),
        };
      });

      onUpdateMapping(mappingIndex, mappingKey, { ...mapping, groups: updatedGroups });
    } else if (type === "columnTitle") {
      const updatedGroups = mapping.groups.map((group) => ({
        ...group,
        values: group.values.map((val) => ({
          ...val,
          mapping: (val.mapping || []).map((m) =>
            m.groupColumn === mappingKey ? { ...m, groupColumn: editText } : m
          ),
        })),
      }));

      onUpdateMapping(mappingIndex, mappingKey, { ...mapping, groups: updatedGroups }, editText);
    }

    cancelEdit();
    setTimeout(() => {
      savingRef.current = false;
    }, 0);
  };

  const displayFileLabel = useMemo(() => {
    if (String(fileName).toLowerCase() === "custom_mapping") return "custom mapping";
    return `from ${fileName}`;
  }, [fileName]);

  const renderValueBoxes = () => {
    if (!groups?.length) return null;

    return groups.map((group, gIndex) => (
      <div key={gIndex} className={MappingHierarchyStyles.valueContainer}>
        {group.values.map((valueObj, valIndex) => {
          const maps = valueObj.mapping || [];

          const fileColors = [...new Set(maps.map((m) => getSourceColor(m)))];
          const singleColor = fileColors.length === 1 ? fileColors[0] : null;
          const showPerColumnColor = fileColors.length > 1;

          const uniqueFileNames = [...new Set(maps.map((m) => m.fileName).filter(Boolean))];
          const singleFileName = uniqueFileNames.length === 1 ? uniqueFileNames[0] : "";

          const isEditing =
            editing.type === "valueName" && editing.groupIndex === gIndex && editing.valueIndex === valIndex;

          const isDefaultLoaded =
            Array.isArray(valueObj?.mapping) &&
            valueObj.mapping.length === 1 &&
            valueObj.mapping[0]?.groupColumn === mappingKey &&
            valueObj.mapping[0]?.value === valueObj.name;

          const normalized = String(valueObj.name || "").trim().toLowerCase();

          let valueLabel =
            mappingType === "one-hot"
              ? valueObj.name === "1"
                ? "Presence (1)"
                : valueObj.name === "0"
                  ? "Absence (0)"
                  : valueObj.name
              : valueObj.name;

          if (mappingType !== "one-hot" && isDefaultLoaded) {
            if (normalized === "integer") valueLabel = "range of integers";
            if (normalized === "double") valueLabel = "range of doubles";
          }

          const hasValueMeta = !!(valueObj?.terminology?.trim() || valueObj?.description?.trim());

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
                      onBlur={() => {
                        setTimeout(() => {
                          if (!savingRef.current) cancelEdit();
                        }, 0);
                      }}
                    />
                  </div>
                  <div className={MappingHierarchyStyles.editingControls}>
                    <CheckIcon
                      className={MappingHierarchyStyles.checkIcon}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        saveEdit();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    />
                  </div>
                </div>
              );
            }

            const title = mappingType === "standard" ? `Edit ${valueLabel}` : valueLabel;

            return (
              <div
                className={MappingHierarchyStyles.editableHover}
                onDoubleClick={() => {
                  if (mappingType === "standard") handleEdit("valueName", gIndex, valIndex, valueObj.name);
                }}
                title={title}
              >
                <span>{valueLabel}</span>
                {mappingType === "standard" && isOpen && (
                  <EditIcon className={MappingHierarchyStyles.editIcon} titleAccess={title} />
                )}
              </div>
            );
          };

          const renderMappingLines = () => {
            return maps.map((map, mapIndex) => {
              const isValueObject = typeof map.value === "object" && map.value !== null;

              const formattedValue = isValueObject
                ? `${formatValue(map.value.minValue, map.value.type)} - ${formatValue(
                  map.value.maxValue,
                  map.value.type
                )}`
                : map.value;

              if (map.groupColumn === mappingKey && map.value === valueObj.name) return null;

              const columnColor = getSourceColor(map);
              const indicatorTitle = map.fileName ? `File: ${map.fileName}` : "";

              return (
                <div key={mapIndex} className={MappingHierarchyStyles.mappingItem}>
                  <div className={MappingHierarchyStyles.mappingColumn}>
                    {showPerColumnColor && (
                      <span
                        className={`${MappingHierarchyStyles.entryIndicator} ${MappingHierarchyStyles.entryIndicatorInMapping}`}
                        style={{ backgroundColor: columnColor }}
                        title={indicatorTitle}
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

          const mappingLines = renderMappingLines();
          const hasMappings = mappingLines?.some(Boolean);

          const singleIndicator = singleColor ? (
            <span
              className={`${MappingHierarchyStyles.entryIndicator} ${MappingHierarchyStyles.entryIndicatorInValue}`}
              style={{ backgroundColor: singleColor }}
              title={singleFileName ? `File: ${singleFileName}` : ""}
            />
          ) : null;

          if (mappingType === "one-hot" && valueObj.name === "0") {
            return (
              <div key={valIndex} className={MappingHierarchyStyles.valueBox}>
                <div
                  className={`${MappingHierarchyStyles.valueName} ${hasMappings ? MappingHierarchyStyles.valueNameWithMappings : ""
                    }`}
                >
                  <div className={MappingHierarchyStyles.valueNameLeft}>
                    {singleIndicator}
                    {renderValueName()}
                  </div>

                  <div className={MappingHierarchyStyles.valueNameRight}>
                    {hasValueMeta && (
                      <IconButton
                        size="small"
                        className={MappingHierarchyStyles.metaBtn}
                        aria-label="Show metadata"
                        onClick={(e) =>
                          openMeta(e, {
                            title: valueLabel,
                            terminology: valueObj.terminology || "",
                            description: valueObj.description || "",
                          })
                        }
                        title={`Show metadata for ${valueLabel}`}
                      >
                        <DescriptionOutlinedIcon fontSize="inherit" />
                      </IconButton>
                    )}
                  </div>
                </div>

                {hasMappings && <div className={MappingHierarchyStyles.mappings}>{mappingLines}</div>}
                {!hasMappings && (
                  <div className={MappingHierarchyStyles.mappingItem}>
                    <span>Rest of values</span>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={valIndex} className={MappingHierarchyStyles.valueBox}>
              <div
                className={`${MappingHierarchyStyles.valueName} ${hasMappings ? MappingHierarchyStyles.valueNameWithMappings : ""
                  }`}
              >
                <div className={MappingHierarchyStyles.valueNameLeft}>
                  {singleIndicator}
                  {renderValueName()}
                </div>

                <div className={MappingHierarchyStyles.valueNameRight}>
                  {hasValueMeta && (
                    <IconButton
                      size="small"
                      className={MappingHierarchyStyles.metaBtn}
                      aria-label="Show metadata"
                      onClick={(e) =>
                        openMeta(e, {
                          title: valueLabel,
                          terminology: valueObj.terminology || "",
                          description: valueObj.description || "",
                        })
                      }
                      title={`Show metadata for ${valueLabel}`}
                    >
                      <DescriptionOutlinedIcon fontSize="inherit" />
                    </IconButton>
                  )}
                </div>
              </div>

              {hasMappings && <div className={MappingHierarchyStyles.mappings}>{mappingLines}</div>}
            </div>
          );
        })}
      </div>
    ));
  };

  const popperContent = useMemo(() => {
    const hasTerm = !!metaPayload.terminology?.trim();
    const hasDesc = !!metaPayload.description?.trim();

    return (
      <div className={MappingHierarchyStyles.metaContent}>
        <div className={MappingHierarchyStyles.metaHeader}>
          <div className={MappingHierarchyStyles.metaTitle} title={metaPayload.title}>
            {metaPayload.title ? `${metaPayload.title} metadata` : "Metadata"}
          </div>
          <IconButton
            size="small"
            className={MappingHierarchyStyles.metaCloseBtn}
            onClick={closeMeta}
            title="Close"
          >
            <CloseIcon fontSize="inherit" />
          </IconButton>
        </div>

        <div className={MappingHierarchyStyles.metaBody}>
          {hasTerm ? (
            <div className={MappingHierarchyStyles.metaRow}>
              <div className={MappingHierarchyStyles.metaKey}>Terminology</div>
              <div className={MappingHierarchyStyles.metaVal}>{metaPayload.terminology}</div>
            </div>
          ) : (
            <div className={MappingHierarchyStyles.metaEmpty}>No terminology</div>
          )}

          {hasDesc ? (
            <div className={MappingHierarchyStyles.metaRow}>
              <div className={MappingHierarchyStyles.metaKey}>Description</div>
              <div className={MappingHierarchyStyles.metaVal}>{metaPayload.description}</div>
            </div>
          ) : (
            <div className={MappingHierarchyStyles.metaEmpty}>No description</div>
          )}
        </div>
      </div>
    );
  }, [metaPayload]);

  const onHeaderClick = () => {
    if (!isOpen) setIsOpen(true);
    onSelect?.();
  };

  const onToggleArrowClick = (e) => {
    e.stopPropagation();
    closeMeta();
    cancelEdit();
    setIsOpen((v) => !v);
  };

  return (
    <div className={`${MappingHierarchyStyles.entryContainer} ${editing.type ? MappingHierarchyStyles.editing : ""}`}>
      <Popper
        open={metaOpen}
        anchorEl={metaAnchorEl}
        placement="bottom-start"
        className={MappingHierarchyStyles.metaPopper}
        modifiers={[
          { name: "offset", options: { offset: [0, 8] } },
          { name: "preventOverflow", options: { padding: 8 } },
        ]}
      >
        <ClickAwayListener onClickAway={closeMeta}>
          <Paper elevation={10} className={MappingHierarchyStyles.metaPaper}>
            {popperContent}
          </Paper>
        </ClickAwayListener>
      </Popper>

      <div
        className={`${MappingHierarchyStyles.headerRow} ${!isOpen ? MappingHierarchyStyles.headerRowClosed : ""}`}
        onClick={onHeaderClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onHeaderClick();
        }}
        title={!isOpen ? "Open" : undefined}
      >
        <div className={MappingHierarchyStyles.headerLeft}>
          <IconButton
            size="small"
            className={MappingHierarchyStyles.collapseBtn}
            onClick={onToggleArrowClick}
            aria-label={isOpen ? "Collapse" : "Expand"}
            title={isOpen ? "Collapse" : "Expand"}
          >
            {isOpen ? <KeyboardArrowUpIcon fontSize="inherit" /> : <KeyboardArrowDownIcon fontSize="inherit" />}
          </IconButton>

          {editing.type === "columnTitle" && mappingType === "standard" ? (
            <div className={MappingHierarchyStyles.inlineEditWrapper} onClick={(e) => e.stopPropagation()}>
              <input
                ref={editRef}
                className={MappingHierarchyStyles.inlineInput}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit();
                  if (e.key === "Escape") cancelEdit();
                }}
                onBlur={() => {
                  setTimeout(() => {
                    if (!savingRef.current) cancelEdit();
                  }, 0);
                }}
              />
              <CheckIcon
                className={MappingHierarchyStyles.checkIcon}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  saveEdit();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />
            </div>
          ) : (
            <div
              className={MappingHierarchyStyles.editableHover}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (mappingType === "standard" && isOpen) handleEdit("columnTitle", null, null, mappingKey);
              }}
              title={mappingType === "standard" && isOpen ? `Edit ${mappingKey}` : mappingKey}
            >
              <h4>{mappingKey}</h4>
              {mappingType === "standard" && isOpen && (
                <EditIcon className={MappingHierarchyStyles.editIcon} titleAccess={`Edit ${mappingKey}`} />
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className={MappingHierarchyStyles.deleteIcon}
        onClick={(e) => {
          e.stopPropagation();
          onDeleteMapping(mappingIndex, mappingKey);
        }}
      >
        <CloseIcon />
      </div>

      {isOpen && (
        <>
          <div className={MappingHierarchyStyles.fileRow}>
            <div className={MappingHierarchyStyles.fileName}>
              <em>{displayFileLabel}</em>
            </div>

            <div className={MappingHierarchyStyles.fileRowActions}>
              {hasColumnMeta && (
                <IconButton
                  size="small"
                  className={MappingHierarchyStyles.metaBtn}
                  aria-label="Show metadata"
                  onClick={(e) => {
                    e.stopPropagation();
                    openMeta(e, {
                      title: mappingKey,
                      terminology: mapping.terminology || "",
                      description: mapping.description || "",
                    });
                  }}
                  title={`Show metadata for ${mappingKey}`}
                >
                  <DescriptionOutlinedIcon fontSize="inherit" />
                </IconButton>
              )}
            </div>
          </div>

          <div className={MappingHierarchyStyles.groupContainer}>{renderValueBoxes()}</div>
        </>
      )}
    </div>
  );
}

export default MappingHierarchy;
