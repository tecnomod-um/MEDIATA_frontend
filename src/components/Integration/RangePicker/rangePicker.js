import React, { useState, useEffect, useCallback } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import RangePickerStyles from "./rangePicker.module.css";

function RangePicker({ min, max, type, onRangeChange, unavailableRanges = [] }) {
  const [selectedRange, setSelectedRange] = useState([min, max]);

  // Set step value based on type
  const step = type === "date" ? 86400000 : 1; // One day in milliseconds for dates

  // Function to get the next available range
  const getNextAvailableRange = useCallback(() => {
    // Sort the unavailable ranges
    const sortedUnavailableRanges = [...unavailableRanges].sort(
      (a, b) => a[0] - b[0]
    );
  
    // Initialize available ranges
    const availableRanges = [];
    let currentStart = min;
  
    sortedUnavailableRanges.forEach(([uStart, uEnd]) => {
      // Adjust uStart to ensure potentialEnd is not less than currentStart
      const potentialEnd = uStart - step >= currentStart ? uStart - step : currentStart - step;
  
      if (currentStart <= potentialEnd) {
        availableRanges.push([currentStart, potentialEnd]);
      }
      currentStart = Math.max(currentStart, uEnd + step);
    });
  
    if (currentStart <= max) {
      availableRanges.push([currentStart, max]);
    }
  
    // Filter out any invalid ranges where start > end
    const validAvailableRanges = availableRanges.filter(
      ([start, end]) => start <= end && start >= min && end <= max
    );
  
    return validAvailableRanges.length > 0 ? validAvailableRanges[0] : null;
  }, [min, max, unavailableRanges, step]);
  

  useEffect(() => {
    // Initialize selectedRange to the next available range
    const nextAvailableRange = getNextAvailableRange();
    if (nextAvailableRange) {
      setSelectedRange(nextAvailableRange);
    } else {
      // No available ranges left
      setSelectedRange([min, min]);
    }
  }, [min, max, unavailableRanges, getNextAvailableRange]);

  const doesRangeOverlapUnavailableRanges = (start, end) => {
    return unavailableRanges.some(([uStart, uEnd]) => {
      // Ranges are inclusive, so we check for any overlap including the endpoints
      return start <= uEnd && end >= uStart;
    });
  };

  const adjustRangeToAvailable = (minValue, maxValue) => {
    let newMin = minValue;
    let newMax = maxValue;

    // While the range overlaps with unavailable ranges, adjust the range
    while (doesRangeOverlapUnavailableRanges(newMin, newMax)) {
      let overlapped = false;
      for (const [uStart, uEnd] of unavailableRanges) {
        if (newMin <= uEnd && newMax >= uStart) {
          overlapped = true;
          if (newMin < uStart && newMax > uEnd) {
            // Unavailable range is within selected range, adjust newMax
            newMax = uStart - step;
            if (newMax < newMin) {
              newMax = newMin;
            }
          } else if (newMin >= uStart && newMax <= uEnd) {
            // Selected range is entirely within unavailable range
            // Need to find next available range
            const nextAvailableRange = getNextAvailableRange();
            if (nextAvailableRange) {
              [newMin, newMax] = nextAvailableRange;
            } else {
              // No available ranges left
              newMin = min;
              newMax = min;
            }
            break;
          } else if (newMin < uStart && newMax <= uEnd) {
            // Adjust newMax to avoid overlap
            newMax = uStart - step;
            if (newMax < newMin) {
              newMax = newMin;
            }
          } else if (newMin >= uStart && newMin <= uEnd) {
            // Adjust newMin to avoid overlap
            newMin = uEnd + step;
            if (newMin > newMax) {
              newMin = newMax;
            }
          }
          break;
        }
      }
      if (!overlapped) {
        break;
      }
    }

    // Ensure newMin and newMax are within the allowed range
    newMin = Math.max(newMin, min);
    newMax = Math.min(newMax, max);

    return [newMin, newMax];
  };

  const handleRangeChange = (values) => {
    // Allow the user to freely move the slider handles
    setSelectedRange(values);
  };

  const handleAfterChange = (values) => {
    const [newMin, newMax] = values;

    // Adjust the range to avoid overlapping with unavailable ranges
    let [adjustedMin, adjustedMax] = adjustRangeToAvailable(newMin, newMax);

    setSelectedRange([adjustedMin, adjustedMax]);
  };

  const handleSetClick = () => {
    const [minValue, maxValue] = selectedRange;

    const formattedMin = type === "date" ? new Date(minValue) : minValue;
    const formattedMax = type === "date" ? new Date(maxValue) : maxValue;

    onRangeChange({ minValue: formattedMin, maxValue: formattedMax });
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

  // Check if there are no available ranges
  const noAvailableRanges = useCallback(() => {
    const nextAvailableRange = getNextAvailableRange();
    return nextAvailableRange === null;
  }, [getNextAvailableRange]);

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
        <span className={RangePickerStyles.rangeDisplay}>
          Selected Range: {formatValue(selectedRange[0])} -{" "}
          {formatValue(selectedRange[1])}
        </span>
      </div>
      <div className={RangePickerStyles.controlsContainer}>
        <div className={RangePickerStyles.sliderContainer}>
          <Slider
            range
            min={min}
            max={max}
            value={selectedRange}
            onChange={handleRangeChange}
            onAfterChange={handleAfterChange}
            railStyle={{ backgroundColor: "#ddd" }}
            trackStyle={[{ backgroundColor: "#007bff" }]}
            handleStyle={[
              { borderColor: "#007bff" },
              { borderColor: "#007bff" },
            ]}
            step={step}
            allowCross={false}
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
