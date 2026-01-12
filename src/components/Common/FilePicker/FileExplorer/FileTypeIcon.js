import React from "react";
import Styles from "../fileExplorer.module.css";
import { getFileExtension } from "./fileUtils";

/**
 * FileTypeIcon - Displays an icon representing the file type (CSV or XLSX)
 * @param {string} name - The filename to determine the icon type
 */
function FileTypeIcon({ name }) {
  const ext = getFileExtension(name);
  const isXlsx = ext === "xlsx" || ext === "xls";
  const label = isXlsx ? "XLSX" : "CSV";
  const cls = isXlsx ? Styles.iconXlsx : Styles.iconCsv;

  return (
    <span className={`${Styles.fileIcon} ${cls}`} aria-hidden="true" title={label}>
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path
          d="M7 2h7l5 5v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
          fill="currentColor"
          opacity="0.14"
        />
        <path
          d="M14 2v5h5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.95"
        />
        <path
          d="M8 13h8M8 16h8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          opacity="0.9"
        />
        <text x="12" y="11.1" textAnchor="middle" fontSize="6" fontWeight="800" fill="currentColor">
          {label}
        </text>
      </svg>
    </span>
  );
}

export default FileTypeIcon;
