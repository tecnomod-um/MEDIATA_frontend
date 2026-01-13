import React from "react";
import Styles from "../fileExplorer.module.css";
import { getFileExtension } from "./fileUtils";
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

/**
 * FileTypeIcon - Displays an icon representing the file type using Material-UI icons
 * @param {string} name - The filename to determine the icon type
 */
function FileTypeIcon({ name }) {
  const ext = getFileExtension(name);
  const isXlsx = ext === "xlsx" || ext === "xls";
  const isCsv = ext === "csv";
  const isJson = ext === "json";
  const isTxt = ext === "txt";

  let IconComponent = InsertDriveFileIcon;
  let label = "File";
  let cls = Styles.iconFile;

  if (isXlsx) {
    IconComponent = TableChartIcon;
    label = "XLSX";
    cls = Styles.iconXlsx;
  } else if (isCsv) {
    IconComponent = DescriptionIcon;
    label = "CSV";
    cls = Styles.iconCsv;
  } else if (isJson) {
    IconComponent = DescriptionIcon;
    label = "JSON";
    cls = Styles.iconJson;
  } else if (isTxt) {
    IconComponent = DescriptionIcon;
    label = "TXT";
    cls = Styles.iconTxt;
  }

  return (
    <span className={`${Styles.fileIcon} ${cls}`} aria-hidden="true" title={label}>
      <IconComponent style={{ fontSize: 22 }} />
    </span>
  );
}

export default FileTypeIcon;
