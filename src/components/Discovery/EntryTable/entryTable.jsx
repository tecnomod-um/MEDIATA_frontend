import { isFeatureSelected } from "../featureSelection";
import React, { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import EntryTableStyles from "./entryTable.module.css";
import FilterIndicator from "../FilterModal/filterIndicator";
import useFeatureSelectionGesture from "../useFeatureSelectionGesture";
import { numericalMethods } from "../CombinedStatistics/numericalSummary";

const statisticDescriptions = {
  Count: "Non-missing observations. Rows are counted; patients are not deduplicated across datasets.",
  "Total Count": "Non-missing observations. Rows are counted; patients are not deduplicated across datasets.",
  "Std. Dev.": "Population standard deviation (divisor n). Date deviations are measured in days.",
  "1st Qrt.": "25th percentile with linear interpolation (R7). Exact pooled percentiles require complete approved value frequencies.",
  Median: "50th percentile with linear interpolation (R7): the average of the two middle values for an even-sized numerical cohort.",
  "3rd Qrt.": "75th percentile with linear interpolation (R7). Exact pooled percentiles require complete approved value frequencies.",
  "Mode %": "Mode frequency divided by non-missing count. Missing observations are reported separately.",
  "2nd Mode %": "Second mode frequency divided by non-missing count.",
  "95% CI (mean)": numericalMethods.confidence,
  Skewness: numericalMethods.skewness,
  Mode: "Numerical rows: " + numericalMethods.mode + " Categorical rows: most frequent category.",
  "Mode count": "Number of non-missing observations equal to each listed numerical mode.",
  "Std. Dev. (sample)": numericalMethods.deviation,
  Kurtosis: numericalMethods.kurtosis,
  Cardinality: "Number of distinct observed categories. Missing values are excluded; pooled cardinality counts the union of categories across datasets.",
};
const statisticWidths = { "95% CI (mean)": 180, Skewness: 120, Kurtosis: 120, Cardinality: 120 };

function getTableHeaders(filteredLists) {
  if (!filteredLists) return [];
  return Object.keys(filteredLists);
}

const Row = React.memo(
  ({ rowIndex, filteredLists, onRowClick, selectedEntries, type, rowTitles, rowFilters }) => {
    const featureName = filteredLists.Name[rowIndex];
    const selectRow = useCallback(event => onRowClick({ featureName, type }, event), [onRowClick, featureName, type]);
    const selectionGesture = useFeatureSelectionGesture(selectRow);
    const isRowSelected =
      isFeatureSelected(selectedEntries || [], filteredLists["Name"][rowIndex], type);
    const rowClassName = `${EntryTableStyles.resTr} ${isRowSelected ? EntryTableStyles.selectedRow : ""
      }`;

    return (
      <tr
        data-feature-selection
        key={`row-${rowIndex}`}
        className={rowClassName}
        title="Long press or Ctrl/Cmd-click to select multiple features"
        {...selectionGesture}
        role="row"
        aria-selected={isRowSelected}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onRowClick({
              featureName: filteredLists["Name"][rowIndex],
              type: type,
            }, e);
          }
        }}
      >
        {Object.keys(filteredLists).map((key) => (
          <td
            key={`${key}-${rowIndex}`}
            className={`${EntryTableStyles.resTd} ${isRowSelected ? EntryTableStyles.selectedEntry : ""
              }`}
            role="cell"
          >
            <span className={key === "Name" && rowFilters?.[filteredLists.Name[rowIndex]] ? EntryTableStyles.filteredName : EntryTableStyles.resSpan} title={key === "Name" && rowTitles?.[filteredLists.Name[rowIndex]] || String(filteredLists[key][rowIndex] ?? "")}>
              {key === "Name" && rowFilters?.[filteredLists.Name[rowIndex]] ? <><span className={EntryTableStyles.resSpan}>{filteredLists[key][rowIndex]}</span><FilterIndicator description={rowFilters[filteredLists.Name[rowIndex]]} /></> : filteredLists[key][rowIndex]}
            </span>
          </td>
        ))}
      </tr>
    );
  },
  (previous, next) => {
    if (
      previous.rowIndex !== next.rowIndex ||
      previous.filteredLists !== next.filteredLists ||
      previous.onRowClick !== next.onRowClick ||
      previous.type !== next.type
      || previous.rowTitles !== next.rowTitles
      || previous.rowFilters !== next.rowFilters
    ) {
      return false;
    }

    const wasSelected = isFeatureSelected(previous.selectedEntries || [], previous.filteredLists.Name[previous.rowIndex], previous.type);
    const isSelected = isFeatureSelected(next.selectedEntries || [], next.filteredLists.Name[next.rowIndex], next.type);
    return wasSelected === isSelected;
  }
);

function getTableContent(filteredLists, maxRows, onRowClick, selectedEntries, type, rowTitles, rowFilters) {
  if (!filteredLists || Object.keys(filteredLists).length === 0) return null;
  const actualRowCount = Math.min(
    Object.values(filteredLists)[0].length,
    maxRows
  );
  const fillerRowCount = Math.max(0, 8 - actualRowCount);

  return (
    <>
      {[...Array(actualRowCount)].map((_, rowIndex) => (
        <Row
          key={rowIndex}
          rowIndex={rowIndex}
          filteredLists={filteredLists}
          onRowClick={onRowClick}
          selectedEntries={selectedEntries}
          type={type}
          rowTitles={rowTitles}
          rowFilters={rowFilters}
        />
      ))}
      {[...Array(fillerRowCount)].map((_, fillerIndex) => (
        <tr
          key={`filler-${fillerIndex}`}
          className={`${EntryTableStyles.resTr} ${EntryTableStyles.fillerRow}`}
          style={{ backgroundColor: "red" }}
        >
          {Object.keys(filteredLists).map((key, index) => (
            <td
              key={`filler-${fillerIndex}-${index}`}
              className={EntryTableStyles.resTd}
            >
              <span className={EntryTableStyles.resSpan}>&nbsp;</span>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// Table component for displaying data entries with virtual scrolling and resizable columns
function EntryTable({ filteredLists, minCellWidth, maxRows = 1000, onRowSelect, selectedEntries, type, rowTitles, rowFilters }) {
  const [tableHeight, setTableHeight] = useState("auto");
  const [activeIndex, setActiveIndex] = useState(null);
  const columns = useMemo(() => createHeaders(getTableHeaders(filteredLists)), [filteredLists]);
  const tableElement = useRef(null);
  const tbodyElement = useRef(null);
  const gridTemplateColumns = columns.map(({ text }) => `minmax(${statisticWidths[text] ?? 100}px, 1fr)`).join(" ");

  function createHeaders(headers) {
    if (headers.length === 0) {
      return [];
    }

    return headers.map((item) => ({
      text: item,
      ref: React.createRef(),
    }));
  }

  useLayoutEffect(() => {
    if (tbodyElement.current && tbodyElement.current.children.length > 0) {
      requestAnimationFrame(() => {
        try {
          let totalHeight = 0;
          const tbody = tbodyElement.current;
          if (!tbody || !tbody.children || !tbody.children.length) return;
  
          const rows = tbody.children;
          if (!rows[0] || !rows[0].children || !rows[0].children[0]) return;
  
          totalHeight += rows[0].children[0].getBoundingClientRect().height;
  
          for (let i = 0; i < rows.length; i++) {
            const cells = rows[i].children;
            let maxHeight = 0;
  
            for (let j = 0; j < cells.length; j++) {
              maxHeight = Math.max(
                maxHeight,
                cells[j].getBoundingClientRect().height
              );
            }
  
            totalHeight += maxHeight;
          }
  
          setTableHeight(`${totalHeight}px`);
        } catch (error) {
          console.error("Error calculating table height:", error);
        }
      });
    }
  }, [filteredLists]);

  const mouseDown = useCallback((index) => {
    setActiveIndex(index);
    toggleTextSelection(false);
  }, []);

  const mouseMove = useCallback(
    (e) => {
      const tableRect = tableElement.current.getBoundingClientRect();
      const gridColumns = columns.map((col, i) => {
        if (i === activeIndex) {
          const colOffsetLeft = col.ref.current.offsetLeft;
          const width =
            e.clientX -
            tableRect.left -
            colOffsetLeft +
            tableElement.current.scrollLeft;
          if (width >= minCellWidth) {
            return `${width}px`;
          }
        }
        return `${col.ref.current.offsetWidth}px`;
      });
      tableElement.current.style.gridTemplateColumns = gridColumns.join(" ");
    },
    [activeIndex, columns, minCellWidth]
  );

  const mouseUp = useCallback(() => {
    setActiveIndex(null);
    toggleTextSelection(true);
  }, []);

  useEffect(() => {
    if (activeIndex !== null) {
      window.addEventListener("mousemove", mouseMove);
      window.addEventListener("mouseup", mouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseup", mouseUp);
    };
  }, [activeIndex, mouseMove, mouseUp]);

  const toggleTextSelection = (enabled) => {
    document.body.style.userSelect = enabled ? "" : "none";
  };

  return (
    <table
      className={EntryTableStyles.resTable}
      style={{ gridTemplateColumns }}
      ref={tableElement}
      role="table"
      aria-label="Data statistics table"
    >
      <thead className={EntryTableStyles.resThead}>
        <tr className={EntryTableStyles.resTr} role="row">
          {columns.map(({ ref, text }, i) => (
            <th className={EntryTableStyles.resTh} ref={ref} key={text} role="columnheader">
              <span className={EntryTableStyles.resSpan} title={statisticDescriptions[text]}>{text}</span>
              <div
                style={{ height: tableHeight }}
                role="separator"
                aria-label="Resize column"
                aria-orientation="vertical"
                onMouseDown={() => mouseDown(i)}
                className={`${EntryTableStyles.resizeHandle} ${activeIndex === i ? EntryTableStyles.active : "idle"
                  }`}
              />
            </th>
          ))}
        </tr>
      </thead>
      <tbody className={EntryTableStyles.resTbody} ref={tbodyElement}>
        {getTableContent(
          filteredLists,
          maxRows,
          onRowSelect,
          selectedEntries,
          type,
          rowTitles,
          rowFilters
        )}
      </tbody>
    </table>
  );
}

export default EntryTable;
