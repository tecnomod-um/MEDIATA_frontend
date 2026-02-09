import React from "react";
import CloseIcon from "@mui/icons-material/Close";
import ColumnMappingStyles from "./columnMapping.module.css";

/**
 * Displays the drop area and list of dropped columns for column mapping.
 * Shows column type, filename, and values/categories for each dropped column.
 */
function DroppedColumnsArea({ groups, onDrop, onDeleteGroup, dropAreaHeight }) {
  const getColumnType = (group) => {
    if (group.values.includes("integer")) return "Integer";
    if (group.values.includes("double")) return "Double";
    if (group.values.includes("date")) return "Date";
    return "Categorical";
  };

  const isNumericOrDate = (group) => {
    return (
      group.values.includes("integer") ||
      group.values.includes("double") ||
      group.values.includes("date")
    );
  };

  const getColumnDescription = (group) => {
    if (group.values.includes("integer") || group.values.includes("double")) {
      return "This column represents numerical data.";
    }
    if (group.values.includes("date")) {
      return "This column represents date values.";
    }
    return null;
  };

  return (
    <div
      className={ColumnMappingStyles.dropArea}
      style={{ height: dropAreaHeight }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {groups.length === 0 && (
        <span className={ColumnMappingStyles.dropText}>Click or drop columns here</span>
      )}

      {groups.map((group, index) => {
        const columnType = getColumnType(group);
        const description = getColumnDescription(group);
        const isNumeric = isNumericOrDate(group);

        return (
          <div key={index} className={ColumnMappingStyles.droppedItem}>
            <div className={ColumnMappingStyles.groupHeader}>
              <span
                className={ColumnMappingStyles.deleteIcon}
                onClick={() => onDeleteGroup(group)}
              >
                <CloseIcon />
              </span>

              <h4 className={ColumnMappingStyles.groupTitle}>
                <span className={ColumnMappingStyles.columnName}>{group.column}</span>
              </h4>

              <div className={ColumnMappingStyles.groupTypeFileWrapper}>
                <span className={ColumnMappingStyles.groupType}>Type: {columnType}</span>
                <em className={ColumnMappingStyles.groupFile}>from {group.fileName}</em>
              </div>
            </div>

            <div className={ColumnMappingStyles.groupContent}>
              {isNumeric ? (
                <p className={ColumnMappingStyles.groupDetail}>{description}</p>
              ) : (
                <div>
                  <p className={ColumnMappingStyles.groupDetail}>Categories:</p>
                  <ul className={ColumnMappingStyles.categoryList}>
                    {group.values.map((value, valueIndex) => (
                      <li key={valueIndex} className={ColumnMappingStyles.categoryItem}>
                        {value}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DroppedColumnsArea;
