import React, { useState } from 'react';
import { MdChevronRight, MdChevronLeft, MdSync } from 'react-icons/md';
import Switch from 'react-switch';
import ToolTrayStyles from './toolTray.module.css';
import { recalculateFeature } from '../../util/petitionHandler';

function ToolTray({ data, filteredData, setFilteredData, setData, showOutliers, setShowOutliers, isToolTrayOpen, toggleToolTray, handleFilesSelected, selectedEntry, setSelectedEntry, file, showIndividualView, toggleView }) {
    const [isLoading, setIsLoading] = useState(false);

    const getEntrySet = (dataSet) => {
        if (dataSet) {
            let entries = [];
            if (dataSet.dateFeatures)
                entries = entries.concat(dataSet.dateFeatures.map((item) => ({
                    name: item.featureName,
                    type: 'date',
                })));
            if (dataSet.categoricalFeatures)
                entries = entries.concat(dataSet.categoricalFeatures.map((item) => ({
                    name: item.featureName,
                    type: 'categorical',
                })));
            if (dataSet.continuousFeatures)
                entries = entries.concat(dataSet.continuousFeatures.map((item) => ({
                    name: item.featureName,
                    type: 'continuous',
                })));

            return entries;
        } else return [];
    }

    const triggerFileInputClick = () => {
        document.getElementById('hiddenFileInput').click();
    }

    const LoadingSpinner = () => (
        <div className={ToolTrayStyles.spinner}>
            <div></div><div></div><div></div>
        </div>
    )

    const isFeatureChecked = (featureName, featureType) => {
        return filteredData[`${featureType}Features`]?.some(item => item.featureName === featureName);
    }

    const toggleFeatureType = async () => {
        if (!selectedEntry || !file) return;

        setIsLoading(true);
        try {
            const switchType = selectedEntry.type === 'categorical' ? 'continuous' : 'categorical';
            const recalcData = await recalculateFeature(file, selectedEntry.featureName, switchType);
            const newType = recalcData.dateFeatures?.some(f => f.featureName === selectedEntry.featureName) ?
                'date' : recalcData.categoricalFeatures?.some(f => f.featureName === selectedEntry.featureName) ?
                    'categorical' : 'continuous';
            const newDataStatistics = { ...data };
            ['dateFeatures', 'categoricalFeatures', 'continuousFeatures'].forEach(featureArray => {
                newDataStatistics[featureArray] = newDataStatistics[featureArray].filter(f => f.featureName !== selectedEntry.featureName);
            });

            newDataStatistics[`${newType}Features`] = (newDataStatistics[`${newType}Features`] || []).concat(recalcData[`${newType}Features`]);

            setData(newDataStatistics);
            setFilteredData(newDataStatistics);
            setSelectedEntry({ ...selectedEntry, type: newType === 'date' ? 'continuous' : newType });
        } catch (error) {
            console.error('Feature recalculation failed:', error);
        } finally {
            setIsLoading(false);
        }
    }

    const handleFeatureCheck = (featureName, featureType) => {
        console.log(featureName + " " + featureType)
        const newFilteredData = { ...filteredData };
        const featureListKey = `${featureType}Features`;
        const featureIndex = newFilteredData[featureListKey].findIndex(f => f.featureName === featureName);

        if (featureIndex > -1) {
            newFilteredData[featureListKey] = newFilteredData[featureListKey].filter((_, index) => index !== featureIndex);
        } else {
            const feature = data[featureListKey].find(f => f.featureName === featureName);
            if (feature) newFilteredData[featureListKey] = (newFilteredData[featureListKey] || []).concat(feature);
        }

        setFilteredData(newFilteredData);
    }

    return (
        <div className={`${ToolTrayStyles.container} ${isToolTrayOpen ? ToolTrayStyles.open : ToolTrayStyles.closed}`}>
            <div className={ToolTrayStyles.toggleButton} onClick={toggleToolTray}>
                {isToolTrayOpen ? <MdChevronRight /> : <MdChevronLeft />}
            </div>
            <div className={ToolTrayStyles.topSection}>
                {selectedEntry ? (
                    <>
                        <h3>{selectedEntry.featureName}</h3>
                        <button
                            className={`${ToolTrayStyles.toggleFeatureTypeButton} ${isLoading ? ToolTrayStyles.loading : ''}`}
                            onClick={toggleFeatureType}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <LoadingSpinner />
                            ) : (<>
                                <span className={ToolTrayStyles.entryType}>{selectedEntry.type.toUpperCase()}</span>
                                <MdSync className={ToolTrayStyles.iconSpin} />
                            </>)}
                        </button>
                    </>
                ) : (
                    <h3>No entry selected</h3>
                )}
            </div>
            <h4 className={ToolTrayStyles.sectionTitle}>Toggle Displayed Entries</h4>
            <div className={ToolTrayStyles.featuresList}>
                <ul>
                    {getEntrySet(data).map((entry) => (
                        <li key={entry.name} className={ToolTrayStyles.featureItem}>
                            <label>
                                <Switch
                                    checked={isFeatureChecked(entry.name, entry.type)}
                                    onChange={() => handleFeatureCheck(entry.name, entry.type)}
                                    height={20}
                                    width={40}
                                    handleDiameter={18}
                                    offColor="#888"
                                    onColor="#0D0"
                                />
                                {entry.name}
                            </label>
                        </li>
                    ))}
                </ul>
            </div>
            <div className={ToolTrayStyles.outliersToggleSection}>
                <label htmlFor="toggleOutliers" className={ToolTrayStyles.outliersLabel}>
                    {showOutliers ? "Outliers are shown" : "Outliers are hidden"}
                    <Switch
                        checked={showOutliers}
                        onChange={setShowOutliers}
                        id="toggleOutliers"
                        height={20}
                        width={48}
                        handleDiameter={18}
                        offColor="#888"
                        onColor="#0D0"
                        className={ToolTrayStyles.outliersSwitch}
                    />
                </label>
            </div>
            <div className={ToolTrayStyles.exportButton} onClick={() => toggleView()}>
                <button>{showIndividualView ? "Display aggregate metrics" : "Display individual metrics"}</button>
            </div>
            <div className={ToolTrayStyles.uploadButtonContainer}>
                <button onClick={triggerFileInputClick}>Upload New Data</button>
                <input
                    type="file"
                    id="hiddenFileInput"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFilesSelected(e.target.files[0])}
                />
            </div>
            <div className={ToolTrayStyles.exportButton}>
                <button>Export Data</button>
            </div>
        </div>
    );
}

export default ToolTray;