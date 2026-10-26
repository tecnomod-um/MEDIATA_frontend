import React, { useMemo, useRef } from "react";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionIcon from "@mui/icons-material/Description";
import AutocompleteInput from "../../Common/AutoCompleteInput/autoCompleteInput";
import TooltipPopup from "../../Common/TooltipPopup/tooltipPopup";
import ColumnMappingStyles from "./columnMapping.module.css";

const EMPTY_SUGGESTIONS = [];

const formatValue = (value, type) => {
  if (type === "date") {
    const date = new Date(value);
    return date instanceof Date && !isNaN(date) ? date.toISOString().split("T")[0] : "";
  }
  return value !== undefined && value !== null ? value.toString() : "";
};

const passthroughLabel = (value) => {
  const type = String(value ?? "").trim().toLowerCase();
  if (type === "integer") return "Range of integers";
  if (type === "double") return "Range of doubles";
  if (type === "date") return "Date range";
  if (type === "natural language") return "Natural Language";
  return "Range";
};

const ValueRow = React.memo(function ValueRow({
  customValue, index, isLocked, valueContentSuggestions, snomedSuggestions,
  buttonRef, rowRef, actions,
}) {
  const terminologyLabels = useMemo(() => {
    const existing = new Set(valueContentSuggestions.map((item) => String(item).toLowerCase()));
    return [
      ...valueContentSuggestions,
      ...snomedSuggestions.map((item) => item.label)
        .filter((label) => !existing.has(String(label).toLowerCase())),
    ];
  }, [valueContentSuggestions, snomedSuggestions]);

  return (
    <div ref={rowRef} className={ColumnMappingStyles.valueMappingContainer}>
      <div className={ColumnMappingStyles.valueMappingRow}>
        {isLocked ? (
          <div className={ColumnMappingStyles.rangeBadgeSlot}>
            <span className={ColumnMappingStyles.rangeBadge}>
              <span className={ColumnMappingStyles.rangeBadgeText} title={passthroughLabel(customValue.mapping[0]?.value)}>{passthroughLabel(customValue.mapping[0]?.value)}</span>
              <button type="button" className={ColumnMappingStyles.rangeBadgeDismiss}
                onClick={() => actions.dismissRangeBadge(customValue.id)}
                aria-label="Set custom value" title="Set custom value">
                <CloseIcon />
              </button>
            </span>
          </div>
        ) : (
          <AutocompleteInput
            value={customValue.name}
            onChange={(raw) => actions.valueName(customValue.id, raw)}
            placeholder="Value content"
            className={ColumnMappingStyles.valueNameInput}
            suggestions={valueContentSuggestions}
          />
        )}
        <AutocompleteInput
          value={customValue.snomedTerm || ""}
          onChange={(raw) => {
            const hit = snomedSuggestions.find((item) => item.value === raw || item.label === raw);
            actions.valueSnomed(customValue.id, hit ? hit.value : raw);
          }}
          placeholder="Value terminology"
          className={ColumnMappingStyles.valueSnomedInput}
          suggestions={terminologyLabels}
        />
        <button
          type="button"
          className={ColumnMappingStyles.descriptionButton}
          onClick={() => actions.description(index)}
        >
          <span className={ColumnMappingStyles.buttonText}>Description</span>
          <span className={ColumnMappingStyles.iconWrapper}>
            <DescriptionIcon fontSize="inherit" className={ColumnMappingStyles.buttonIcon} />
          </span>
        </button>
        <button ref={buttonRef} onClick={() => actions.addMapping(index)} className={ColumnMappingStyles.addMappingButton}>
          <span className={ColumnMappingStyles.buttonText}>Add Mapping</span>
          <span className={ColumnMappingStyles.iconWrapper}>
            <AddIcon fontSize="inherit" className={ColumnMappingStyles.buttonIcon} />
          </span>
        </button>
      </div>
      <button type="button" onClick={() => actions.removeValue(index)} className={`${ColumnMappingStyles.closeIconButton} ${ColumnMappingStyles.removeValueButton}`} aria-label="Remove value" title="Remove value">
        <CloseIcon />
      </button>
      {!isLocked && customValue.mapping.length > 0 && (
        <div className={ColumnMappingStyles.mappingSummary}>
          {customValue.mapping.length} values from{" "}
          {new Set(customValue.mapping.map((mapping) => mapping.groupColumn)).size} columns mapped
        </div>
      )}
      <ul className={ColumnMappingStyles.currentMappings}>
        {customValue.mapping.map((mapping, mapIndex) => {
          const sameColumn = customValue.mapping.filter((item) => item.groupColumn === mapping.groupColumn);
          const distinctSources = new Set(sameColumn.map((item) =>
            item.groupKey ?? [item.nodeId, item.fileName, item.groupColumn].join("::")
          ));
          const isAmbiguous = distinctSources.size > 1;
          const displayValue = typeof mapping.value === "object" && mapping.value.minValue !== undefined
            ? (mapping.value.mode === "exclude" ? "Outside " : "") +
              formatValue(mapping.value.minValue, mapping.value.type) + " - " +
              formatValue(mapping.value.maxValue, mapping.value.type)
            : mapping.value;
          return (
            <li key={mapIndex} className={ColumnMappingStyles.mappedItem}>
              <div className={ColumnMappingStyles.mappedRow}>
                <span className={ColumnMappingStyles.mappedLabel}>
                  From {mapping.groupColumn}{isAmbiguous ? " (from " + mapping.fileName + ")" : ""}:
                </span>
                <span className={ColumnMappingStyles.mappedValue}>{displayValue}</span>
                <button type="button" aria-label={`Remove mapping from ${mapping.groupColumn}`} className={ColumnMappingStyles.closeIconButton} onClick={() => actions.removeMapping(index, mapIndex)}>
                  <CloseIcon />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
});

// The list owns transitions while unchanged values retain their row instances.
function ValuesList({ customValues, valueContentSuggestions, snomedValueTerminologySuggestions,
  isTooltipShown, tooltipRef, tooltipMessage, onTooltipClose, onValueNameChange,
  onValueSnomedChange, onDismissRangeBadge, onAddMapping, onRemoveMapping, onRemoveValue, onOpenDescription,
  isLockedPassthroughValue, buttonRefs, containerRef, disableExitAnimation = false }) {
  const mappingRefs = useRef({});
  const latestActions = useRef({});
  latestActions.current = {
    onValueNameChange, onValueSnomedChange, onDismissRangeBadge, onAddMapping, onRemoveMapping,
    onRemoveValue, onOpenDescription,
  };
  const actions = useMemo(() => ({
    valueName: (...args) => latestActions.current.onValueNameChange(...args),
    valueSnomed: (...args) => latestActions.current.onValueSnomedChange(...args),
    dismissRangeBadge: (...args) => latestActions.current.onDismissRangeBadge(...args),
    addMapping: (...args) => latestActions.current.onAddMapping(...args),
    removeMapping: (...args) => latestActions.current.onRemoveMapping(...args),
    removeValue: (...args) => latestActions.current.onRemoveValue(...args),
    description: (...args) => latestActions.current.onOpenDescription(...args),
  }), []);

  return (
    <div ref={containerRef} className={[ColumnMappingStyles.valueListContainer, customValues.length ? ColumnMappingStyles.hasValues : ""].join(" ")}>
      <TransitionGroup>
        {customValues.map((customValue, index) => {
          if (!mappingRefs.current[customValue.id]) mappingRefs.current[customValue.id] = React.createRef();
          const rowRef = mappingRefs.current[customValue.id];
          return (
            <CSSTransition
              key={customValue.id}
              timeout={disableExitAnimation ? { enter: 250, exit: 0 } : 250}
              classNames={{
                enter: ColumnMappingStyles.enter,
                enterActive: ColumnMappingStyles.enterActive,
                exit: ColumnMappingStyles.exit,
                exitActive: ColumnMappingStyles.exitActive,
              }}
              nodeRef={rowRef}
              onExit={() => {
                if (disableExitAnimation) return;
                const node = rowRef.current;
                if (!node) return;
                const top = node.offsetTop;
                node.style.position = "absolute";
                node.style.top = top + "px";
                node.style.left = "0";
                node.style.right = "0";
                node.style.width = "calc(100% - 10px)";
              }}
              onExited={() => {
                const node = rowRef.current;
                if (!node) return;
                node.style.position = "";
                node.style.top = "";
                node.style.left = "";
                node.style.right = "";
                node.style.width = "";
              }}
            >
              <ValueRow
                customValue={customValue}
                index={index}
                isLocked={isLockedPassthroughValue(customValue)}
                valueContentSuggestions={valueContentSuggestions}
                snomedSuggestions={snomedValueTerminologySuggestions[customValue.id] || EMPTY_SUGGESTIONS}
                buttonRef={buttonRefs.current[index]}
                rowRef={rowRef}
                actions={actions}
              />
            </CSSTransition>
          );
        })}
      </TransitionGroup>
      {isTooltipShown && tooltipRef && (
        <TooltipPopup message={tooltipMessage} buttonRef={tooltipRef} onClose={onTooltipClose} />
      )}
    </div>
  );
}

export default React.memo(ValuesList);
