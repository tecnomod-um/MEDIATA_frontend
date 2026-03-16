import React from "react";
import FileExplorerStyles from "./fileExplorer.module.css";
import { getFileExtension } from "./fileUtils";
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

// Gets a file Icon for each extension
function FileTypeIcon({ name }) {
  const ext = getFileExtension(name);
  const isXlsx = ext === "xlsx" || ext === "xls";
  const isCsv = ext === "csv";
  const isJson = ext === "json";
  const isTxt = ext === "txt";

  let IconComponent = InsertDriveFileIcon;
  let label = "File";
  let cls = FileExplorerStyles.iconFile;

  if (isXlsx) {
    IconComponent = TableChartIcon;
    label = "XLSX";
    cls = FileExplorerStyles.iconXlsx;
  } else if (isCsv) {
    IconComponent = DescriptionIcon;
    label = "CSV";
    cls = FileExplorerStyles.iconCsv;
  } else if (isJson) {
    IconComponent = DescriptionIcon;
    label = "JSON";
    cls = FileExplorerStyles.iconJson;
  } else if (isTxt) {
    IconComponent = DescriptionIcon;
    label = "TXT";
    cls = FileExplorerStyles.iconTxt;
  }

  return (
    <span className={`${FileExplorerStyles.fileIcon} ${cls}`} aria-hidden="true" title={label}>
      <IconComponent className={FileExplorerStyles.fileIconSvg} />
    </span>
  );
}

export default FileTypeIcon;
