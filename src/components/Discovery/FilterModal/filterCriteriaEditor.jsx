import React, { useId, useState } from "react";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { matchingFilterFeatures } from "./filterFeatures";
import styles from "./filterModal.module.css";

export default function FilterCriteriaEditor({selectedFeature, showHeading, availableStatistics, filterConditions, matchColumns, columnMappings, isLoading, onAddConditions}) {
  const inputId = useId();
  const [filterType, setFilterType] = useState("equal");
  const [value, setValue] = useState("");
  const [upperValue, setUpperValue] = useState("");
  const [dateValue, setDateValue] = useState(new Date());
  const [dateRange, setDateRange] = useState([new Date(), new Date()]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const categorical = availableStatistics.categoricalFeatures?.find(feature => feature.featureName === selectedFeature);
  const isDate = availableStatistics.dateFeatures?.some(feature => feature.featureName === selectedFeature);
  const between = filterType === "between";
  const usedCategories = (filterConditions[selectedFeature] || []).map(condition => condition.value);
  const members = categorical ? matchColumns ? matchingFilterFeatures(availableStatistics, categorical, columnMappings) : [categorical] : [];
  const categoryOptions = [...new Set(members.flatMap(feature => Object.keys(feature.categoryCounts || {})))]
    .filter(category => !usedCategories.includes(category)).map(category => ({value:category, label:category}));
  const validNumber = number => number !== "" && Number.isFinite(Number(number));
  const validDate = date => date instanceof Date && Number.isFinite(date.getTime());
  const canAdd = categorical ? selectedCategories.length > 0
    : isDate ? between ? dateRange.every(validDate) : validDate(dateValue)
    : validNumber(value) && (!between || validNumber(upperValue));

  const addFilter = () => {
    if (!canAdd || isLoading) return;
    const conditions = categorical ? selectedCategories.map(category => ({type:"equal", value:category, filterType:"categorical"}))
      : [{type:filterType, filterType:isDate ? "date" : "continuous", value:isDate
        ? between ? dateRange.map(date => date.toISOString()) : dateValue.toISOString()
        : between ? [value, upperValue] : value}];
    onAddConditions(selectedFeature, conditions);
    setSelectedCategories([]);
  };

  const numericField = (label, field, current, update) => <div>
    <label htmlFor={`${inputId}-${field}`}>{label}</label>
    <input id={`${inputId}-${field}`} data-testid={field === "min-value" ? "min-value-input" : field === "max-value" ? "max-value-input" : undefined}
      type="number" className={styles.input} value={current} onChange={event => update(event.target.value)} disabled={isLoading} />
  </div>;
  const dateField = (label, field, current, update) => <div>
    <label htmlFor={`${inputId}-${field}`}>{label}</label>
    <DatePicker id={`${inputId}-${field}`} selected={current} onChange={update} className={styles.datePicker} disabled={isLoading} />
  </div>;

  return <section className={styles.featureEditor} aria-label={`Filter ${selectedFeature}`}>
    {showHeading && <h4>{selectedFeature}</h4>}
    <div className={styles.filterCriteria} style={{gridTemplateColumns:categorical ? "3fr 1fr" : between ? "1fr 1fr 1fr 1fr" : "1fr 2fr 1fr"}}>
      {categorical ? <div>
        <label htmlFor={`${inputId}-categories`}>Choose categories:</label>
        <Select inputId={`${inputId}-categories`} aria-label={`Categories for ${selectedFeature}`} isMulti classNamePrefix="react-select"
          options={categoryOptions} value={categoryOptions.filter(option => selectedCategories.includes(option.value))}
          onChange={options => setSelectedCategories((options || []).map(option => option.value))} isDisabled={isLoading} />
      </div> : <>
        <div>
          <label htmlFor={`${inputId}-filter-type`}>Filter Type</label>
          <select id={`${inputId}-filter-type`} data-testid={isDate ? "date-filter-type" : "continuous-filter-type"}
            className={styles.select} value={filterType} onChange={event => setFilterType(event.target.value)} disabled={isLoading}>
            <option value="equal">Equal</option>
            <option value="between">Between</option>
            <option value="less">{isDate ? "Sooner than" : "Less than"}</option>
            <option value="greater">{isDate ? "Later than" : "Greater than"}</option>
          </select>
        </div>
        {isDate ? between ? <>
          {dateField("Start Date", "date-start", dateRange[0], date => setDateRange([date, dateRange[1]]))}
          {dateField("End Date", "date-end", dateRange[1], date => setDateRange([dateRange[0], date]))}
        </> : dateField("Date", "date-value", dateValue, setDateValue)
          : between ? <>
            {numericField("Min Value", "min-value", value, setValue)}
            {numericField("Max Value", "max-value", upperValue, setUpperValue)}
          </> : numericField("Value", "continuous-value", value, setValue)}
      </>}
      <button className={styles.addButton} onClick={addFilter} disabled={!canAdd || isLoading}>
        {filterConditions[selectedFeature]?.length ? "Add More Criteria" : "Add Filter"}
      </button>
    </div>
  </section>;
}
