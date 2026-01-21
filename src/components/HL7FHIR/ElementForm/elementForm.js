import React from 'react';
import ElementFormStyles from './elementForm.module.css';

// Form component for editing FHIR element properties
export default function ElementForm({ element, formValues, onChange, onCreateClusters, allDescribed }) {
  if (!element) return null;

  return (
    <div className={ElementFormStyles.detailPanel}>
      <div className={ElementFormStyles.headerRow}>
        <h2 className={ElementFormStyles.detailTitle}>{element.label}</h2>
        {allDescribed && (
          <button
            className={ElementFormStyles.buildClassBtn}
            onClick={onCreateClusters}
          >
            Create Clusters
          </button>
        )}
      </div>

      <div className={ElementFormStyles.formBody}>
        <div className={ElementFormStyles.formField}>
          <label>Name:</label>
          <input type="text" value={element.label} disabled />
        </div>
        <div className={ElementFormStyles.formField}>
          <label>Description:</label>
          <textarea
            value={formValues.description}
            onChange={e => onChange('description', e.target.value)}
          />
        </div>
        <div className={ElementFormStyles.formField}>
          <label>Possible Values:</label>
          <textarea
            value={formValues.possibleValues}
            onChange={e => onChange('possibleValues', e.target.value)}
          />
        </div>
        <div className={ElementFormStyles.formField}>
          <label>Value Type:</label>
          <select
            className={ElementFormStyles.typeSelect}
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
