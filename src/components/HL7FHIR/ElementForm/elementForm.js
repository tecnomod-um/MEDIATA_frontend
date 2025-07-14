import React from 'react';
import styles from './elementForm.module.css';

export default function ElementForm({
  element,
  formValues,
  onChange,
  onCreateClusters,
  allDescribed
}) {
  if (!element) return null;

  return (
    <div className={styles.detailPanel}>
      <div className={styles.headerRow}>
        <h2 className={styles.detailTitle}>{element.label}</h2>
        {allDescribed && (
          <button
            className={styles.buildClassBtn}
            onClick={onCreateClusters}
          >
            Create Clusters
          </button>
        )}
      </div>

      <div className={styles.formBody}>
        <div className={styles.formField}>
          <label>Name:</label>
          <input type="text" value={element.label} disabled />
        </div>
        <div className={styles.formField}>
          <label>Description:</label>
          <textarea
            value={formValues.description}
            onChange={e => onChange('description', e.target.value)}
          />
        </div>
        <div className={styles.formField}>
          <label>Possible Values:</label>
          <textarea
            value={formValues.possibleValues}
            onChange={e => onChange('possibleValues', e.target.value)}
          />
        </div>
        <div className={styles.formField}>
          <label>Value Type:</label>
          <select
            className={styles.typeSelect}
            value={formValues.valueType}
            onChange={e => onChange('valueType', e.target.value)}
          >
            <option value="string">String</option>
            <option value="integer">Integer</option>
            <option value="double">Double</option>
            <option value="date">Date</option>
          </select>
        </div>
      </div>
    </div>
  );
}
