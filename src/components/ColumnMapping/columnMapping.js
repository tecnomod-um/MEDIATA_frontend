import React, { useState, useEffect } from 'react';
import ColumnMappingStyles from './columnMapping.module.css';

function ColumnMapping({ onMappingChange, onSave, groups }) {
    const [unionName, setUnionName] = useState('');
    const [customValues, setCustomValues] = useState([]);
    const [removeFromHierarchy, setRemoveFromHierarchy] = useState(false);
    const [currentGroupIndex, setCurrentGroupIndex] = useState(null);

    useEffect(() => {
        onMappingChange(groups);
    }, [groups, onMappingChange]);

    const handleDrop = (e) => {
        e.preventDefault();
        const droppedColumn = JSON.parse(e.dataTransfer.getData("column"));
        if (!groups.some(group => group.column === droppedColumn.column)) {
            const newGroups = [...groups, droppedColumn];
            onMappingChange(newGroups);
        }
    };

    const handleUnionNameChange = (e) => {
        setUnionName(e.target.value);
    };

    const addNewValue = () => {
        setCustomValues([...customValues, { name: '', mapping: [] }]);
    };

    const handleValueNameChange = (index, newName) => {
        const updatedCustomValues = customValues.map((customValue, i) =>
            i === index ? { ...customValue, name: newName } : customValue
        );
        setCustomValues(updatedCustomValues);
    };

    const handleAddMapping = (valueIndex) => {
        setCurrentGroupIndex(valueIndex);
    };

    const handleSelectMapping = (groupColumn, value) => {
        if (currentGroupIndex !== null) {
            const updatedCustomValues = customValues.map((customValue, i) =>
                i === currentGroupIndex
                    ? {
                        ...customValue,
                        mapping: [...customValue.mapping, { groupColumn, value }]
                    }
                    : customValue
            );
            setCustomValues(updatedCustomValues);
            setCurrentGroupIndex(null);
        }
    };

    const handleDeleteGroup = (column) => {
        const newGroups = groups.filter(group => group.column !== column);
        onMappingChange(newGroups);
    };

    const saveMapping = () => {
        onSave(groups, unionName, customValues, removeFromHierarchy);
        setUnionName('');
        setCustomValues([]);
    };

    const getAvailableValues = (group) => {
        const alreadyMappedValues = customValues.flatMap(customValue => customValue.mapping.map(map => map.value));
        return group.values.filter(value => !alreadyMappedValues.includes(value) || value === 'integer' || value === 'date');
    };

    return (
        <div className={ColumnMappingStyles.mappingSection}>
            <div
                className={ColumnMappingStyles.dropArea}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
            >
                {groups.length === 0 && (
                    <span className={ColumnMappingStyles.dropText}>Drop elements here</span>
                )}
                {groups.map((group, index) => (
                    <div key={index} className={ColumnMappingStyles.droppedItem}>
                        <div className={ColumnMappingStyles.groupHeader}>
                            <span
                                className={ColumnMappingStyles.deleteIcon}
                                onClick={() => handleDeleteGroup(group.column)}
                            >✕</span>
                            <h4 className={ColumnMappingStyles.groupTitle}>{group.column}</h4>
                            <span className={ColumnMappingStyles.groupType}>
                                Type: {group.values.includes('integer')
                                    ? 'Integer'
                                    : group.values.includes('date')
                                        ? 'Date'
                                        : 'Categorical'}
                            </span>
                        </div>
                        <div className={ColumnMappingStyles.groupContent}>
                            {group.values.includes('integer') && (<p className={ColumnMappingStyles.groupDetail}>This column represents numerical data.</p>)}
                            {group.values.includes('date') && (<p className={ColumnMappingStyles.groupDetail}>This column represents date values.</p>)}
                            {!group.values.includes('integer') && !group.values.includes('date') && (
                                <div>
                                    <p className={ColumnMappingStyles.groupDetail}>Categories:</p>
                                    <ul className={ColumnMappingStyles.categoryList}>
                                        {group.values.map((value, valueIndex) => (
                                            <li key={valueIndex} className={ColumnMappingStyles.categoryItem}>{value}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <div className={ColumnMappingStyles.createEntrySection}>
                <div className={ColumnMappingStyles.entryHeaderRow}>
                <label className={ColumnMappingStyles.removeCheckboxLabel}>
                            <input
                                type="checkbox"
                                checked={removeFromHierarchy}
                                onChange={(e) => setRemoveFromHierarchy(e.target.checked)}
                                style={{ display: 'inline' }}
                                className={ColumnMappingStyles.removeCheckboxInput}
                            />
                            Remove used elements
                        </label>
                    <input
                        type="text"
                        className={ColumnMappingStyles.unionInput}
                        placeholder="Enter a name for the custom entry"
                        value={unionName}
                        onChange={handleUnionNameChange}
                    />
                    <div className={ColumnMappingStyles.buttonsAndCheckbox}>
                        <button onClick={addNewValue} className={ColumnMappingStyles.addValueButton}>Add Value</button>
                        <button onClick={saveMapping} className={ColumnMappingStyles.saveButton}>Save</button>
                    </div>
                </div>
                {currentGroupIndex !== null && (
                    <div className={ColumnMappingStyles.selectMappingContainer}>
                        <h5>Select Value to Map</h5>
                        {groups.map((group, index) => (
                            <div key={index} className={ColumnMappingStyles.mappingGroup}>
                                <strong>{group.column}</strong>
                                <ul className={ColumnMappingStyles.mappingOptions}>
                                    {getAvailableValues(group).map((value, valueIndex) => (
                                        <li key={valueIndex}>
                                            <button
                                                onClick={() => handleSelectMapping(group.column, value)}
                                                className={ColumnMappingStyles.mappingButton}
                                            >
                                                {value}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
                <div className={ColumnMappingStyles.valueListContainer}>
                    {customValues.map((customValue, index) => (
                        <div key={index} className={ColumnMappingStyles.valueMappingContainer}>
                            <div className={ColumnMappingStyles.valueMappingRow}>
                                <input
                                    type="text"
                                    className={ColumnMappingStyles.valueNameInput}
                                    placeholder="Value name"
                                    value={customValue.name}
                                    onChange={(e) => handleValueNameChange(index, e.target.value)}
                                />
                                <button
                                    onClick={() => handleAddMapping(index)}
                                    className={ColumnMappingStyles.addMappingButton}
                                >
                                    Add Mapping
                                </button>
                            </div>
                            {customValue.mapping.length > 0 && (
                                <ul className={ColumnMappingStyles.currentMappings}>
                                    {customValue.mapping.map((map, mapIndex) => (
                                        <li key={mapIndex}>
                                            {map.groupColumn} ➡ {map.value}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default ColumnMapping;
