import React, { useId, useState } from "react";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import Divider from "@mui/material/Divider";
import { MdArrowDropDown, MdCheck, MdLink, MdMergeType, MdViewList } from "react-icons/md";
import styles from "./columnMappings.module.css";

export default function TableMergeControl({ tableName, combined, onChange, onEditMappings, mappingCount, disabled }) {
  const [anchor, setAnchor] = useState(null);
  const menuId = useId();
  const selectMode = value => {
    setAnchor(null);
    if (value && !mappingCount) onEditMappings();
    else onChange(value);
  };
  return <>
    <Button className={styles.trigger} size="small"
      startIcon={combined ? <MdMergeType /> : <MdViewList />} endIcon={<MdArrowDropDown />}
      aria-label={`${tableName} table options: ${combined ? "combined" : "separate"} rows`}
      aria-haspopup="menu" aria-expanded={Boolean(anchor)} aria-controls={anchor ? menuId : undefined}
      title="Combine features across files" disabled={disabled} onClick={event => setAnchor(event.currentTarget)}>
      Merge
    </Button>
    <Menu id={menuId} anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}
      slotProps={{ paper: { className: styles.menu } }}>
      <MenuItem selected={!combined} onClick={() => selectMode(false)}><ListItemIcon>{!combined && <MdCheck />}</ListItemIcon>Separate rows</MenuItem>
      <MenuItem selected={combined} onClick={() => selectMode(true)}><ListItemIcon>{combined && <MdCheck />}</ListItemIcon>Combined rows</MenuItem>
      <Divider />
      <MenuItem onClick={() => { setAnchor(null); onEditMappings(); }}><ListItemIcon><MdLink /></ListItemIcon>Combine features<span aria-hidden="true" className={styles.menuCount}>{mappingCount}</span></MenuItem>
    </Menu>
  </>;
}
