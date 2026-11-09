import React from "react";
import Select from "react-select";
import styles from "./filterModal.module.css";

const menuStyles = {
  menuPortal: base => ({ ...base, zIndex: 1001 }),
};

// Keep menus outside the modal's scrolling body so its footer cannot clip them.
export default function FilterSelect(props) {
  return <Select {...props} menuPortalTarget={document.body} menuPosition="fixed"
    menuPlacement="auto" styles={menuStyles} classNames={{ menuPortal: () => styles.selectPortal }} />;
}
