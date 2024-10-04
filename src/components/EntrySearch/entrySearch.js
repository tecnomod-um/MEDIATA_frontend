import React, { useState, useMemo, useCallback } from "react";
import EntryTable from "../EntryTable/entryTable";
import EntrySearchStyles from "./entrySearch.module.css";

function EntrySearch({ resultData, onRowSelect, selectedEntry, type }) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleChange = useCallback((e) => {
    setSearchTerm(e.target.value.toLowerCase());
  }, []);

  const filteredResult = useMemo(() => {
    let filteredResult = {};
    if (resultData) {
      Object.keys(resultData).forEach((key) => {
        filteredResult[key] = resultData[key].filter((_, idx) => {
          return Object.values(resultData).some(
            (array) =>
              array[idx] &&
              String(array[idx]).toLowerCase().includes(searchTerm)
          );
        });
      });
    }
    return filteredResult;
  }, [resultData, searchTerm]);

  const placeholderText =
    resultData && Object.keys(resultData).length > 0
      ? `Search by ${Object.keys(resultData).join(", ")}`
      : "No elements to display";

  return (
    <span className={EntrySearchStyles.search}>
      <input
        className={EntrySearchStyles.input}
        type="search"
        placeholder={placeholderText}
        onChange={handleChange}
      />
      <span
        className={`${EntrySearchStyles.resultCount} ${
          Object.values(filteredResult)[0]?.length > 0
            ? EntrySearchStyles.shown
            : ""
        }`}
      >
        {Object.values(filteredResult)[0]?.length}
      </span>
      <div className={EntrySearchStyles.dataContainer}>
        <EntryTable
          filteredLists={filteredResult}
          minCellWidth={100}
          onRowSelect={onRowSelect}
          selectedEntry={selectedEntry}
          type={type}
        />
      </div>
    </span>
  );
}

export default EntrySearch;
