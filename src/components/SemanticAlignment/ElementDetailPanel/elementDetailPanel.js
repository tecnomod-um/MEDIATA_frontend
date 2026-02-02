import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import ElementDetailPanelStyles from "./elementDetailPanel.module.css";
import { fetchClasses, fetchClassFields, fetchSuggestions } from "../../../util/petitionHandler";
import { Collapse } from "react-collapse";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import AutocompleteInput from "../../Common/AutoCompleteInput/autoCompleteInput";
import DeleteIcon from "@mui/icons-material/Delete";
import AddBoxIcon from "@mui/icons-material/AddBox";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import TooltipPopup from "../../Common/TooltipPopup/tooltipPopup";
import debounce from "lodash/debounce";

// Main control panel for defining a semantic structure based on elements 
const ElementDetailPanel = ({ activeElement, currentSelection, onSelectOption, activeElementIndex, activeCategoryIndex, elementFormValues, setElementFormValues, onBuildClass, onDeleteClass, builtClasses }) => {
  const [options, setOptions] = useState([]);
  const [formFields, setFormFields] = useState([]);
  const [fieldSuggestions, setFieldSuggestions] = useState({});
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipButtonRef = useRef(null);
  const transitionRef = useRef(null);
  const fieldsCache = useRef({});

  useEffect(() => {
    let didCancel = false;
    async function fetchData() {
      try {
        const classesData = await fetchClasses();
        if (!didCancel) setOptions(classesData);
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    }
    fetchData();
    return () => { didCancel = true; };
  }, []);

  useEffect(() => {
    if (options.length === 0) return;
    const selectionMissing = !currentSelection || !options.some(o => o.iri === currentSelection.iri);

    if (selectionMissing) onSelectOption(options[0]);
  }, [options, currentSelection, onSelectOption]);


  // fetch fields only when a real class option is selected
  useEffect(() => {
    if (!currentSelection?.iri) {
      setFormFields([]);
      return;
    }

    const key = currentSelection.label;
    if (fieldsCache.current[key]) {
      setFormFields(fieldsCache.current[key]);
      return;
    }

    let didCancel = false;
    (async () => {
      try {
        const fields = await fetchClassFields(key);
        if (!didCancel) {
          fieldsCache.current[key] = fields;
          setFormFields(fields);
        }
      } catch (err) {
        if (!didCancel) {
          console.error("Error fetching fields for", key, err);
          setFormFields([]);
        }
      }
    })();
    return () => { didCancel = true; };
  }, [currentSelection?.iri, currentSelection?.label]);

  const debouncedFetchSuggestions = useMemo(() => debounce((value, field) => {
    fetchSuggestions(value, "snomed").then((suggestions) => {
      const enriched = suggestions.map((s) => {
        const code = s.iri.split("/").pop();
        return {
          label: s.label,
          value: `${s.label} | ${code}`,
        };
      });
      setFieldSuggestions((prev) => ({ ...prev, [field]: enriched }));
    }).catch((error) => {
      console.error("Error fetching suggestions:", error);
      setFieldSuggestions((prev) => ({ ...prev, [field]: [] }));
    });
  }, 300), []);

  const itemKey = useMemo(() => {
    return activeCategoryIndex != null
      ? `${activeElementIndex}-cat-${activeCategoryIndex}`
      : `${activeElementIndex}`;
  }, [activeElementIndex, activeCategoryIndex]);

  const currentValues = useMemo(() => {
    return elementFormValues[itemKey] || {};
  }, [elementFormValues, itemKey]);

  const handleInputChange = useCallback(
    (field, raw) => {
      const hit = (fieldSuggestions[field] || []).find((s) => s.label === raw);
      const toSave = hit ? hit.value : raw;

      setElementFormValues((prev) => ({ ...prev, [itemKey]: { ...prev[itemKey], [field]: toSave }, }));

      if (raw && raw.length > 2) debouncedFetchSuggestions(raw, field);
    }, [debouncedFetchSuggestions, fieldSuggestions, itemKey, setElementFormValues]);

  const isBuilt = useMemo(() => builtClasses && builtClasses[itemKey], [builtClasses, itemKey]);

  /*
  const canBuild = useMemo(() => {
    return formFields.every(({ name, optional, type }) => {
      if (optional) return true;
      const v = currentValues[name];
      if (type === "type") {
        const kind = currentValues[`${name}_kind`];
        if (kind === "boolean") return v === true || v === false;
        if (kind === "categorical") {
          const cats = currentValues[`${name}_categories`] || [];
          return cats.length > 0 && cats.every(([k, val]) => k && val);
        }
        return false;
      }
      return v != null && v !== "";
    });
  }, [formFields, currentValues]);
*/
  const elementCategories = useMemo(() => activeElement.categories || [], [activeElement.categories]);

  useEffect(() => {
    formFields.forEach(({ name, type }) => {
      if (type !== "type") return;
      const kind = currentValues[`${name}_kind`];
      const catKey = `${name}_categories`;
      if (kind === "categorical" && !currentValues[catKey]) {
        setElementFormValues((prev) => ({
          ...prev,
          [itemKey]: {
            ...prev[itemKey],
            [catKey]: elementCategories.map((cat) => [cat, ""]),
          },
        }));
      }
    });
  }, [
    formFields,
    currentValues,
    elementCategories,
    itemKey,
    setElementFormValues,
  ]);

  useEffect(() => {
    if (!formFields.length) return;

    setElementFormValues(prev => {
      const existing = prev[itemKey] || {};
      if (existing.field_id != null && existing.field_id !== "") return prev;
      return {
        ...prev,
        [itemKey]: {
          ...existing,
          field_id: activeElement.name
        }
      };
    });
  }, [
    itemKey,
    formFields.length,
    activeElement.name,
    setElementFormValues
  ]);


  useEffect(() => {
    if (!formFields.length || !currentSelection?.iri) return;

    setElementFormValues(prev => {
      const existing = prev[itemKey] || {};
      const cur = existing.pattern_type ?? "";
      const labels = options.map(o => o.label);

      if (cur === "" || labels.includes(cur)) {
        return {
          ...prev,
          [itemKey]: {
            ...existing,
            pattern_type: currentSelection.label
          }
        };
      }
      return prev;
    });
  }, [itemKey, formFields.length, currentSelection?.iri, options, setElementFormValues, currentSelection?.label]);

  if (!activeElement) {
    return (
      <div className={ElementDetailPanelStyles.detailPanel}>
        <p>Please select an element or category on the left.</p>
      </div>
    );
  }

  return (
    <div className={ElementDetailPanelStyles.detailPanel}>
      {/* Header with Build/Delete button */}
      <div className={ElementDetailPanelStyles.headerRow}>
        <h2 className={ElementDetailPanelStyles.detailTitle}>{activeElement.name}</h2>
        <button
          className={`${ElementDetailPanelStyles.buildClassBtn} ${isBuilt ? ElementDetailPanelStyles.delete : ""}`}
          onClick={() => { if (isBuilt) onDeleteClass(itemKey); else onBuildClass(formFields); }}
        >
          <span className={ElementDetailPanelStyles.buttonText}>{isBuilt ? "Delete" : "Build class"}</span>
          {isBuilt ? <DeleteIcon className={ElementDetailPanelStyles.buttonIcon} /> : <AddBoxIcon className={ElementDetailPanelStyles.buttonIcon} />}
        </button>
      </div>

      {/* Tabs / Options */}
      <div className={ElementDetailPanelStyles.tabLinesContainer}>
        <div className={ElementDetailPanelStyles.options}>
          {options.map(option => (
            <button
              key={option.iri}
              className={`${ElementDetailPanelStyles.optionButton} ${currentSelection?.iri === option.iri ? ElementDetailPanelStyles.selected : ""}`}
              onClick={() => onSelectOption(option)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {options.length > 0 && (
          <div className={ElementDetailPanelStyles.tooltipContainer}>
            <InfoOutlinedIcon
              ref={tooltipButtonRef}
              className={ElementDetailPanelStyles.tooltipIcon}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            />
            {showTooltip && (
              <TooltipPopup
                message="Select an ontology class and configure its fields to build the element."
                buttonRef={tooltipButtonRef}
                onClose={() => setShowTooltip(false)}
                offsetY={-10}
              />
            )}
          </div>
        )}
      </div>

      {/* Form Fields */}
      <div className={ElementDetailPanelStyles.collapseWrapper}>
        <Collapse isOpened springConfig={{ stiffness: 80, damping: 30 }} className={ElementDetailPanelStyles.collapseOuter} contentClassName={ElementDetailPanelStyles.collapseInner}  >
          <SwitchTransition mode="out-in">
            <CSSTransition
              key={currentSelection?.iri || "empty"}
              timeout={300}
              classNames={{
                enter: ElementDetailPanelStyles.fadeEnter,
                enterActive: ElementDetailPanelStyles.fadeEnterActive,
                exit: ElementDetailPanelStyles.fadeExit,
                exitActive: ElementDetailPanelStyles.fadeExitActive,
              }}
              nodeRef={transitionRef}
            >
              <div ref={transitionRef} className={ElementDetailPanelStyles.formFieldContainer}>
                {formFields.length > 0 ? (
                  formFields.map(({ name, optional, type }) => {
                    const raw = currentValues[name];

                    const display = (() => {
                      const hit = (fieldSuggestions[name] || []).find((s) => s.value === raw || s.label === raw);
                      if (hit) return hit.label;
                      if (typeof raw === "string" && raw.includes("|"))
                        return raw.split("|")[0].trim();
                      return raw;
                    })();
                    // const display = fieldSuggestions[name]?.find(s => s.iri === raw)?.label || raw;
                    const kind = currentValues[`${name}_kind`];
                    return (
                      <div key={name} className={ElementDetailPanelStyles.formField}>
                        <label>{name} {!optional && <em>*</em>}</label>

                        {(type === "string" || type === "statement") && (
                          <input
                            value={raw || ""}
                            onChange={e => handleInputChange(name, e.target.value)}
                            placeholder={`Enter ${name}`}
                          />
                        )}

                        {type === "code" && (
                          <AutocompleteInput
                            value={display}
                            onChange={val => handleInputChange(name, val)}
                            placeholder={`Enter ${name}`}
                            suggestions={(fieldSuggestions[name] || []).map(s => s.label)}
                            limitInitial={false}
                          />
                        )}

                        {type === "type" && (
                          <>
                            <div className={ElementDetailPanelStyles.selectRow}>
                              <select
                                required
                                className={ElementDetailPanelStyles.typeSelect}
                                value={kind || ""}
                                onChange={e => handleInputChange(`${name}_kind`, e.target.value)}
                              >
                                <option value="">Select…</option>
                                <option value="boolean">Boolean</option>
                                <option value="categorical">Categorical</option>
                                <option value="integer">Integer</option>
                                <option value="double">Double</option>
                                <option value="date">Date</option>
                              </select>

                              {kind === "categorical" && (
                                <button
                                  type="button"
                                  className={ElementDetailPanelStyles.addRowBtn}
                                  onClick={() => {
                                    const cats = [...(currentValues[`${name}_categories`] || [])];
                                    cats.push(["", ""]);
                                    handleInputChange(`${name}_categories`, cats);
                                  }}
                                >
                                  + Add row
                                </button>
                              )}

                              {kind === "boolean" && (
                                <div className={ElementDetailPanelStyles.booleanOptions}>
                                  <label>
                                    <input
                                      type="radio"
                                      checked={raw === true}
                                      onChange={() => handleInputChange(name, true)}
                                    /> True
                                  </label>
                                  <label>
                                    <input
                                      type="radio"
                                      checked={raw === false}
                                      onChange={() => handleInputChange(name, false)}
                                    /> False
                                  </label>
                                </div>
                              )}
                            </div>

                            {kind === "categorical" && (
                              <div className={ElementDetailPanelStyles.categoricalContainer}>
                                {(currentValues[`${name}_categories`] || []).map((row, i) => {
                                  const catsKey = `${name}_categories`;
                                  const suggKey = `${name}_categories_value_${i}`;
                                  const displayVal =
                                    typeof row[1] === "string" && row[1].includes("|")
                                      ? row[1].split("|")[0].trim()
                                      : row[1] || "";

                                  return (
                                    <div key={i} className={ElementDetailPanelStyles.categoryRow}>
                                      <input
                                        value={row[0]}
                                        onChange={e => {
                                          const cats = [...(currentValues[catsKey] || [])];
                                          cats[i] = [e.target.value, row[1]];
                                          handleInputChange(catsKey, cats);
                                        }}
                                        placeholder="Category"
                                      />
                                      <AutocompleteInput
                                        value={displayVal}
                                        onChange={val => {
                                          const hit = (fieldSuggestions[suggKey] || []).find(s => s.label === val);
                                          const toSave = hit ? hit.value : val;

                                          const cats = [...(currentValues[catsKey] || [])];
                                          cats[i] = [row[0], toSave];
                                          handleInputChange(catsKey, cats);

                                          if (val && val.length > 2)
                                            debouncedFetchSuggestions(val, suggKey);

                                        }}
                                        placeholder="Value"
                                        suggestions={(fieldSuggestions[suggKey] || []).map(s => s.label)}
                                        limitInitial={false}
                                      />

                                      <button
                                        type="button"
                                        className={ElementDetailPanelStyles.removeRowBtn}
                                        onClick={() => {
                                          const cats = [...(currentValues[catsKey] || [])];
                                          cats.splice(i, 1);
                                          handleInputChange(catsKey, cats);
                                        }}
                                        aria-label="Remove category row"
                                      >
                                        <CloseIcon fontSize="small" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                          </>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className={ElementDetailPanelStyles.spinnerContainer}>
                    <div className={ElementDetailPanelStyles.spinner} />
                  </div>
                )}
              </div>
            </CSSTransition>
          </SwitchTransition>
        </Collapse>
      </div>
    </div>
  );
}

export default ElementDetailPanel;
