// Table component for displaying data entries with virtual scrolling
import React, { useState, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import EntryTableStyles from "./entryTable.module.css";

function getTableHeaders(filteredLists) {
  if (!filteredLists) return [];
  return Object.keys(filteredLists);
}

const Row = React.memo(
  ({ rowIndex, filteredLists, onRowClick, selectedEntry, type }) => {
    const isRowSelected =
      selectedEntry &&
      filteredLists["Name"][rowIndex] === selectedEntry.featureName &&
      type === selectedEntry.type;
    const rowClassName = `${EntryTableStyles.resTr} ${isRowSelected ? EntryTableStyles.selectedRow : ""
      }`;

    return (
      <tr
        key={`row-${rowIndex}`}
        className={rowClassName}
        onClick={() =>
          onRowClick({
            featureName: filteredLists["Name"][rowIndex],
            type: type,
          })
        }
        role="row"
        aria-selected={isRowSelected}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onRowClick({
              featureName: filteredLists["Name"][rowIndex],
              type: type,
            });
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
            <span className={EntryTableStyles.resSpan}>
              {filteredLists[key][rowIndex]}
            </span>
          </td>
        ))}
      </tr>
    );
  }
);

function getTableContent(filteredLists, maxRows, onRowClick, selectedEntry, type) {
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
          selectedEntry={selectedEntry}
          type={type}
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

function EntryTable({ filteredLists, minCellWidth, maxRows = 1000, onRowSelect, selectedEntry, type }) {
  const [tableHeight, setTableHeight] = useState("auto");
  const [activeIndex, setActiveIndex] = useState(null);
  const [columns, setColumns] = useState(createHeaders(["."]));
  const tableElement = useRef(null);
  const tbodyElement = useRef(null);
  const gridTemplateColumns = columns.map(() => "minmax(100px, 1fr)").join(" ");

  function createHeaders(headers) {
    if (headers.length === 0) {
      return [];
    }

    return headers.map((item) => ({
      text: item,
      ref: React.createRef(),
    }));
  }

  useEffect(() => {
    const tableHeaders = getTableHeaders(filteredLists);
    setColumns(createHeaders(tableHeaders));
  }, [filteredLists]);

  useLayoutEffect(() => {
    if (tbodyElement.current && tbodyElement.current.children.length > 0) {
      requestAnimationFrame(() => {
        let totalHeight = 0;
        const rows = tbodyElement.current.children;
        totalHeight += rows[0].children[0].getBoundingClientRect().height;
        for (let i = 0; i < rows.length; i++) {
          const cells = rows[i].children;
          let maxHeight = 0;
          for (let j = 0; j < cells.length; j++)
            maxHeight = Math.max(
              maxHeight,
              cells[j].getBoundingClientRect().height
            );
          totalHeight += maxHeight;
        }
        setTableHeight(`${totalHeight}px`);
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
              <span className={EntryTableStyles.resSpan}>{text}</span>
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
          selectedEntry,
          type
        )}
      </tbody>
    </table>
  );
}

export default EntryTable;
