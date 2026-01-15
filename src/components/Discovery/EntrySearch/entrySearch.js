import React, { useState, useMemo, useCallback } from "react";
import EntryTable from "../EntryTable/entryTable";
import EntrySearchStyles from "./entrySearch.module.css";

// Search wrapper for the feature entries table
function EntrySearch({ resultData, onRowSelect, selectedEntry, type }) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleChange = useCallback((e) => {
    setSearchTerm(e.target.value.toLowerCase());
  }, []);

  const filteredResult = useMemo(() => {
    let filtered = {};
    if (resultData) {
      Object.keys(resultData).forEach((key) => {
        filtered[key] = resultData[key].filter((_, idx) =>
          Object.values(resultData).some(
            (array) =>
              array[idx] &&
              String(array[idx]).toLowerCase().includes(searchTerm)
          )
        );
      });
    }
    return filtered;
  }, [resultData, searchTerm]);

  const rowCount = Object.values(filteredResult)[0]?.length || 0;

  return (
    <div className={EntrySearchStyles.search}>
      <div className={EntrySearchStyles.inputContainer}>
        <input
          className={EntrySearchStyles.input}
          type="search"
          placeholder={
            resultData && Object.keys(resultData).length > 0
              ? `Search by ${Object.keys(resultData).join(", ")}`
              : "No elements to display"
          }
          onChange={handleChange}
          aria-label="Search entries"
          aria-describedby="entry-search-count"
          role="searchbox"
        />
      </div>
      <div className={EntrySearchStyles.dataContainer}>
        <EntryTable
          filteredLists={filteredResult}
          minCellWidth={100}
          onRowSelect={onRowSelect}
          selectedEntry={selectedEntry}
          type={type}
        />
        <span
          className={EntrySearchStyles.resultCount}
          id="entry-search-count"
          role="status"
          aria-live="polite"
          aria-label={`${rowCount} result${rowCount !== 1 ? 's' : ''} found`}
        >
          {rowCount}
        </span>
      </div>
    </div>
  );
}

export default EntrySearch;
