import React, { useState, useMemo } from "react";
import ColumnSearchStyles from "./columnSearch.module.css";

function ColumnSearch({ columnsData, handleColumnClick, handleDragStart }) {
    const [searchTerm, setSearchTerm] = useState("");

    const handleChange = (e) => {
        setSearchTerm(e.target.value.toLowerCase());
    };

    const filteredColumns = useMemo(() => {
        return columnsData.filter((column) =>
            column.column.toLowerCase().includes(searchTerm)
        );
    }, [columnsData, searchTerm]);

    return (
        <div className={ColumnSearchStyles.search}>
            <input
                className={ColumnSearchStyles.input}
                type="search"
                placeholder={`Search columns`}
                onChange={handleChange}
            />
            <div className={ColumnSearchStyles.scrollableContainer}>
                {filteredColumns.map((column, index) => (
                    <div
                        key={index}
                        className={ColumnSearchStyles.columnItem}
                        style={{ borderLeftColor: column.color }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, column)}
                        onClick={() => handleColumnClick(column)}
                    >
                        {column.column}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ColumnSearch;
