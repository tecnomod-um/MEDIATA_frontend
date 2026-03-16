import React from "react";
import CloseIcon from "@mui/icons-material/Close";
import ColumnMappingStyles from "./droppedColumnsList.module.css";

// Component for displaying dropped columns in the drop area
function DroppedColumnsList({ groups, onDeleteGroup, onDrop, height }) {
  const handleDragOver = (e) => e.preventDefault();

  return (
    <div
      className={ColumnMappingStyles.dropArea}
      style={{ height }}
      onDragOver={handleDragOver}
      onDrop={onDrop}
    >
      {groups.length === 0 && (
        <span className={ColumnMappingStyles.dropText}>
          Click or drop columns here
        </span>
      )}
      {groups.map((group, index) => (
        <div key={index} className={ColumnMappingStyles.droppedItem}>
          <div className={ColumnMappingStyles.groupHeader}>
            <span
              className={ColumnMappingStyles.deleteIcon}
              onClick={() => onDeleteGroup(group)}
            >
              <CloseIcon />
            </span>

            <h4 className={ColumnMappingStyles.groupTitle}>
              <span className={ColumnMappingStyles.columnName}>
                {group.column}
              </span>
            </h4>

            <div className={ColumnMappingStyles.groupTypeFileWrapper}>
              <span className={ColumnMappingStyles.groupType}>
                Type:{" "}
                {group.values.includes("integer")
                  ? "Integer"
                  : group.values.includes("double")
                  ? "Double"
                  : group.values.includes("date")
                  ? "Date"
                  : "Categorical"}
              </span>
              <em className={ColumnMappingStyles.groupFile}>
                from {group.fileName}
              </em>
            </div>
          </div>

          <div className={ColumnMappingStyles.groupContent}>
            {group.values.includes("integer") ||
            group.values.includes("double") ? (
              <p className={ColumnMappingStyles.groupDetail}>
                This column represents numerical data.
              </p>
            ) : group.values.includes("date") ? (
              <p className={ColumnMappingStyles.groupDetail}>
                This column represents date values.
              </p>
            ) : (
              <div>
                <p className={ColumnMappingStyles.groupDetail}>Categories:</p>
                <ul className={ColumnMappingStyles.categoryList}>
                  {group.values.map((value, valueIndex) => (
                    <li
                      key={valueIndex}
                      className={ColumnMappingStyles.categoryItem}
                    >
                      {value}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default DroppedColumnsList;
