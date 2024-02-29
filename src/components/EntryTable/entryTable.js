import React, { useState, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import EntryTableStyles from "./entryTable.module.css";

function getTableHeaders(filteredLists) {
    if (!filteredLists) return [];
    return Object.keys(filteredLists);
}

function getTableContent(filteredLists, tbodyElement, maxRows) {
    if (!filteredLists || Object.keys(filteredLists).length === 0) return null;
    const rowCount = Math.min(Object.values(filteredLists)[0].length, maxRows);

    return (
        <tbody className={EntryTableStyles.resTbody} ref={tbodyElement}>
            {[...Array(rowCount)].map((_, rowIndex) => (
                <tr key={`row-${rowIndex}`} className={EntryTableStyles.resTr}>
                    {Object.keys(filteredLists).map((key) => (
                        <td key={`${key}-${rowIndex}`} className={EntryTableStyles.resTd}>
                            <span className={EntryTableStyles.resSpan}>{filteredLists[key][rowIndex]}</span>
                        </td>
                    ))}
                </tr>
            ))}
        </tbody>
    );
}

// Displays the query results in a compact table with resizable columns
const EntryTable = ({ filteredLists, minCellWidth, maxRows = 1000 }) => {
    const [tableHeight, setTableHeight] = useState("auto");
    const [activeIndex, setActiveIndex] = useState(null);
    const [columns, setColumns] = useState(createHeaders(["."]));
    const tableElement = useRef(null);
    const tbodyElement = useRef(null);
    const gridTemplateColumns = columns.map(() => 'minmax(100px, 1fr)').join(' ');

    function createHeaders(headers) {
        if (headers.length === 0) {
            return [];
        }

        return headers.map((item) => ({
            text: item,
            ref: React.createRef()
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
                    for (let j = 0; j < cells.length; j++) {
                        maxHeight = Math.max(maxHeight, cells[j].getBoundingClientRect().height);
                    }
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

    const mouseMove = useCallback((e) => {
        const tableRect = tableElement.current.getBoundingClientRect();
        const gridColumns = columns.map((col, i) => {
            if (i === activeIndex) {
                const colOffsetLeft = col.ref.current.offsetLeft;
                const width = e.clientX - tableRect.left - colOffsetLeft + tableElement.current.scrollLeft;
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
        document.body.style.userSelect = enabled ? '' : 'none';
    }

    return (
        <table className={EntryTableStyles.resTable} style={{ gridTemplateColumns }} ref={tableElement}>
            <thead className={EntryTableStyles.resThead}>
                <tr className={EntryTableStyles.resTr}>
                    {columns.map(({ ref, text }, i) => (
                        <th className={EntryTableStyles.resTh} ref={ref} key={text}>
                            <span className={EntryTableStyles.resSpan}>{text}</span>
                            <div
                                style={{ height: tableHeight }}
                                onMouseDown={() => mouseDown(i)}
                                className={`${EntryTableStyles.resizeHandle} ${activeIndex === i ? EntryTableStyles.active : "idle"}`}
                            />
                        </th>
                    ))}
                </tr>
            </thead>
            {getTableContent(filteredLists, tbodyElement, maxRows)}
        </table>
    );
}

export default EntryTable;
