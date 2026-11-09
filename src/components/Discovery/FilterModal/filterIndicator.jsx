import React from "react";
import styles from "./filterIndicator.module.css";

export default function FilterIndicator({ description }) {
  return description ? <sup className={styles.indicator} role="img" aria-label={`Filtered records: ${description}`} title={`Filtered records: ${description}`}>*</sup> : null;
}
