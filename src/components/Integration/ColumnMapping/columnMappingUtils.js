/**
 * Utility functions for ColumnMapping component.
 * Provides helpers for validation, formatting, and data processing.
 */

/**
 * Generates a unique key for a group based on its nodeId, fileName, and column.
 */
export const getGroupKey = (group) => {
  return `${group.nodeId}::${group.fileName}::${group.column}`;
};

/**
 * Extracts min and max values from a group's values array based on type.
 * @param {Array} values - Array of value strings (e.g., ["min:0", "max:100"])
 * @param {string} type - Type of data ("integer", "double", or "date")
 * @returns {Object} Object with min and max properties
 */
export const extractMinMax = (values, type) => {
  let min = null;
  let max = null;
  values.forEach((value) => {
    if (type === "date") {
      if (value.startsWith("earliest:")) {
        min = new Date(value.replace("earliest:", "")).getTime();
      } else if (value.startsWith("latest:")) {
        max = new Date(value.replace("latest:", "")).getTime();
      }
    } else if (type === "integer" || type === "double") {
      if (value.startsWith("min:")) {
        min = parseFloat(value.replace("min:", ""));
      } else if (value.startsWith("max:")) {
        max = parseFloat(value.replace("max:", ""));
      }
    }
  });
  return { min, max };
};

/**
 * Formats a value for display based on its type.
 * @param {*} value - The value to format
 * @param {string} type - The type of value ("date", "integer", "double")
 * @returns {string} Formatted value
 */
export const formatValue = (value, type) => {
  if (type === "date") {
    if (typeof value === "number") {
      const date = new Date(value);
      return date.toISOString().split("T")[0];
    }
    return value;
  }
  return value;
};

/**
 * Gets available values from a group that haven't been mapped yet.
 * @param {Object} group - The group to check
 * @param {Array} customValues - Array of custom values with mappings
 * @returns {Array} Array of available values
 */
export const getAvailableValues = (group, customValues) => {
  const groupKey = getGroupKey(group);

  const columnMappings = customValues.flatMap((customValue) =>
    customValue.mapping
      .filter((map) => map.groupKey === groupKey)
      .map((map) => map.value)
  );

  return group.values.filter(
    (value) =>
      !columnMappings.includes(value) ||
      value === "integer" ||
      value === "double" ||
      value === "date"
  );
};

/**
 * Gets unavailable ranges for numeric/date columns.
 * @param {Object} group - The group to check
 * @param {Array} customValues - Array of custom values with mappings
 * @returns {Array} Array of range objects { min, max }
 */
export const getUnavailableRanges = (group, customValues) => {
  const groupKey = getGroupKey(group);
  const ranges = [];

  customValues.forEach((customValue) => {
    customValue.mapping.forEach((map) => {
      if (map.groupKey === groupKey && typeof map.value === "object" && map.value !== null) {
        ranges.push({ min: map.value.minValue, max: map.value.maxValue });
      }
    });
  });

  return ranges;
};

/**
 * Checks if a custom value is locked (has only numeric type mappings).
 * @param {Object} customValue - The custom value to check
 * @returns {boolean} True if the value should be locked
 */
export const isLockedNumericValue = (customValue) => {
  if (!customValue.mapping || customValue.mapping.length === 0) return false;

  return customValue.mapping.every(
    (map) =>
      map.value === "integer" ||
      map.value === "double" ||
      (typeof map.value === "object" && map.value !== null && !Array.isArray(map.value))
  );
};

/**
 * Wraps text in brackets if not empty and not already bracketed.
 * @param {string} text - Text to bracket
 * @returns {string} Bracketed text or empty string
 */
export const bracketed = (text) => {
  const t = (text || "").trim();
  if (!t) return "";
  if (t.startsWith("[") && t.endsWith("]")) return t;
  return `[${t}]`;
};

/**
 * Validates the save operation and returns an error message if invalid.
 * @param {string} unionName - The union column name
 * @param {Array} customValues - Array of custom values
 * @returns {string} Error message or empty string if valid
 */
export const getSaveValidationError = (unionName, customValues) => {
  if (unionName.trim().length === 0) {
    return "Please set a new column name.";
  }
  if (customValues.length === 0) {
    return "Please add at least one value.";
  }
  
  const unnamedIndex = customValues.findIndex((cv) => cv.name.trim().length === 0);
  if (unnamedIndex !== -1) {
    return `Value #${unnamedIndex + 1} has no contents.`;
  }

  const unmappedIndex = customValues.findIndex(
    (cv) => !cv.mapping || cv.mapping.length === 0
  );
  if (unmappedIndex !== -1) {
    const cv = customValues[unmappedIndex];
    const label = cv?.name?.trim() ? `"${cv.name.trim()}"` : `#${unmappedIndex + 1}`;
    return `Value ${label} has no mappings. Add at least one mapping or remove the value.`;
  }

  return "";
};

/**
 * Checks if save should be disabled.
 * @param {string} unionName - The union column name
 * @param {Array} customValues - Array of custom values
 * @returns {boolean} True if save should be disabled
 */
export const isSaveDisabled = (unionName, customValues) => {
  const hasValidName = unionName.trim().length > 0;
  const hasAtLeastOneValue = customValues.length > 0;
  const allValuesNamed =
    hasAtLeastOneValue && customValues.every((cv) => cv.name.trim().length > 0);
  const allValuesMapped =
    hasAtLeastOneValue && customValues.every((cv) => (cv.mapping?.length ?? 0) > 0);
  return !(hasValidName && hasAtLeastOneValue && allValuesNamed && allValuesMapped);
};
