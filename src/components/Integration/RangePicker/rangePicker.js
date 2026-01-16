import React, { useState, useEffect, useCallback } from "react";
import RangePickerStyles from "./rangePicker.module.css";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

// Range picker control with slider for numeric and date ranges
function RangePicker({ min, max, type, onRangeChange, unavailableRanges = [] }) {
  const [selectedRange, setSelectedRange] = useState([min, max]);
  const [isEditingDisplay, setIsEditingDisplay] = useState(false);
  const [accentColor, setAccentColor] = useState("#9ABDDC");

  const step = type === "date" ? 86400000 : 1;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = window.getComputedStyle(document.documentElement);
    const v = root.getPropertyValue("--button-color-light").trim();
    if (v) setAccentColor(v);
  }, []);

  const doesRangeOverlapUnavailableRanges = useCallback(
    (start, end) =>
      unavailableRanges.some(([uStart, uEnd]) => start <= uEnd && end >= uStart),
    [unavailableRanges]
  );

  const isSelectionValid = useCallback(
    (range) => {
      if (!range || range.length !== 2) return false;
      const [s, e] = range;
      if (s < min || e > max || s > e) return false;
      if (doesRangeOverlapUnavailableRanges(s, e)) return false;
      return true;
    },
    [min, max, doesRangeOverlapUnavailableRanges]
  );

  const getNextAvailableRange = useCallback(() => {
    const sortedUnavailableRanges = [...unavailableRanges].sort(
      (a, b) => a[0] - b[0]
    );

    const availableRanges = [];
    let currentStart = min;

    sortedUnavailableRanges.forEach(([uStart, uEnd]) => {
      const potentialEnd =
        uStart - step >= currentStart ? uStart - step : currentStart - step;
      if (currentStart <= potentialEnd) availableRanges.push([currentStart, potentialEnd]);
      currentStart = Math.max(currentStart, uEnd + step);
    });
    if (currentStart <= max) availableRanges.push([currentStart, max]);
    const validAvailableRanges = availableRanges.filter(
      ([start, end]) => start <= end && start >= min && end <= max
    );

    return validAvailableRanges.length > 0 ? validAvailableRanges[0] : null;
  }, [min, max, unavailableRanges, step]);

  useEffect(() => {
    if (isSelectionValid(selectedRange)) return;

    const next = getNextAvailableRange();
    const target = next ?? [min, min];
    const needsUpdate =
      !Array.isArray(selectedRange) ||
      selectedRange.length !== 2 ||
      selectedRange[0] !== target[0] ||
      selectedRange[1] !== target[1];

    if (needsUpdate) setSelectedRange(target);
  }, [min, max, unavailableRanges, step, getNextAvailableRange, isSelectionValid, selectedRange]);

  const adjustRangeToAvailable = (minValue, maxValue) => {
    let newMin = minValue;
    let newMax = maxValue;

    while (doesRangeOverlapUnavailableRanges(newMin, newMax)) {
      let overlapped = false;
      for (const [uStart, uEnd] of unavailableRanges) {
        if (newMin <= uEnd && newMax >= uStart) {
          overlapped = true;
          if (newMin < uStart && newMax > uEnd) {
            newMax = uStart - step;
            if (newMax < newMin) newMax = newMin;
          } else if (newMin >= uStart && newMax <= uEnd) {
            const nextAvailableRange = getNextAvailableRange();
            if (nextAvailableRange) [newMin, newMax] = nextAvailableRange;
            else {
              newMin = min;
              newMax = min;
            }
            break;
          } else if (newMin < uStart && newMax <= uEnd) {
            newMax = uStart - step;
            if (newMax < newMin) newMax = newMin;
          } else if (newMin >= uStart && newMin <= uEnd) {
            newMin = uEnd + step;
            if (newMin > newMax) newMin = newMax;
          }
          break;
        }
      }
      if (!overlapped) break;
    }

    newMin = Math.max(newMin, min);
    newMax = Math.min(newMax, max);

    return [newMin, newMax];
  };

  const handleInputChange = (index, rawValue) => {
    let numeric;

    if (type === "date") {
      const d = new Date(rawValue);
      if (Number.isNaN(d.getTime())) return;
      numeric = d.getTime();
    } else {
      const n = parseFloat(rawValue);
      if (Number.isNaN(n)) return;
      numeric = n;
    }

    const other = selectedRange[index === 0 ? 1 : 0];
    let newMin = index === 0 ? numeric : Math.min(other, numeric);
    let newMax = index === 1 ? numeric : Math.max(other, numeric);

    [newMin, newMax] = adjustRangeToAvailable(newMin, newMax);
    setSelectedRange([newMin, newMax]);
  };

  const handleRangeChange = (values) => {
    const arr = Array.isArray(values) ? values : [values, values];
    setSelectedRange(arr);
  };

  const handleChangeComplete = (value) => {
    const values = Array.isArray(value) ? value : [value, value];
    const [newMin, newMax] = values;
    const [adjustedMin, adjustedMax] = adjustRangeToAvailable(newMin, newMax);
    setSelectedRange([adjustedMin, adjustedMax]);
  };

  const handleSetClick = () => {
    const [minValue, maxValue] = selectedRange;
    const formattedMin = type === "date" ? new Date(minValue) : minValue;
    const formattedMax = type === "date" ? new Date(maxValue) : maxValue;
    onRangeChange({ minValue: formattedMin, maxValue: formattedMax });
    setIsEditingDisplay(false);
  };

  const formatValue = (value) => {
    if (type === "date") {
      const date = new Date(value);
      return date instanceof Date && !isNaN(date)
        ? date.toISOString().split("T")[0]
        : "";
    }
    return value !== undefined && value !== null ? value.toString() : "";
  };

  const noAvailableRanges = useCallback(
    () => getNextAvailableRange() === null,
    [getNextAvailableRange]
  );

  if (noAvailableRanges()) {
    return (
      <div className={RangePickerStyles.rangePicker}>
        <div className={RangePickerStyles.noRangesMessage}>
          All ranges have been mapped.
        </div>
      </div>
    );
  }

  return (
    <div className={RangePickerStyles.rangePicker}>
      <div className={RangePickerStyles.rangeDisplayWrapper}>
        {!isEditingDisplay ? (
          <span
            className={`${RangePickerStyles.rangeText} ${RangePickerStyles.rangeTextEditable}`}
            onDoubleClick={() => setIsEditingDisplay(true)}
            title="Double-click to edit values"
          >
            Selected range: {formatValue(selectedRange[0])} –{" "}
            {formatValue(selectedRange[1])}
          </span>
        ) : (
          <>
            <span className={RangePickerStyles.rangeLabel}>Selected range:</span>
            <div className={RangePickerStyles.rangeInputs}>
              <input
                className={RangePickerStyles.rangeInput}
                type={type === "date" ? "date" : "number"}
                value={
                  type === "date"
                    ? formatValue(selectedRange[0])
                    : selectedRange[0]
                }
                onChange={(e) => handleInputChange(0, e.target.value)}
              />
              <span className={RangePickerStyles.rangeSeparator}>–</span>
              <input
                className={RangePickerStyles.rangeInput}
                type={type === "date" ? "date" : "number"}
                value={
                  type === "date"
                    ? formatValue(selectedRange[1])
                    : selectedRange[1]
                }
                onChange={(e) => handleInputChange(1, e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      <div className={RangePickerStyles.controlsContainer}>
        <div className={RangePickerStyles.sliderContainer}>
          <Slider
            range
            min={min}
            max={max}
            value={selectedRange}
            onChange={handleRangeChange}
            onChangeComplete={handleChangeComplete}
            step={step}
            allowCross={false}
            styles={{
              rail: { backgroundColor: "#ddd" },
              track: { backgroundColor: "var(--background-nav-tool-background-color-active)" },
              handle: { borderColor: "var(--background-nav-tool-background-color-active)" },
            }}
          />
        </div>
        <button
          onClick={handleSetClick}
          className={RangePickerStyles.mappingButton}
        >
          Set
        </button>
      </div>
    </div>
  );
}

export default RangePicker;
