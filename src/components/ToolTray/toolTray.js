import React from 'react';
import { MdChevronRight, MdChevronLeft } from 'react-icons/md';
import Switch from 'react-switch';
import Slider from 'react-slider';
import ToolTrayStyles from './toolTray.module.css';

function ToolTray({ data, showOutliers, setShowOutliers, setFilteredDataStatistics, filteredDataStatistics, isToolTrayOpen, toggleToolTray, handleFilesSelected, selectedEntry }) {
    const columns = [];

    const handleSliderChange = (value) => {
        // TODO
    }

    const triggerFileInputClick = () => {
        document.getElementById('hiddenFileInput').click();
    }

    return (
        <div className={`${ToolTrayStyles.container} ${isToolTrayOpen ? ToolTrayStyles.open : ToolTrayStyles.closed}`}>
            <div className={ToolTrayStyles.toggleButton} onClick={toggleToolTray}>
                {isToolTrayOpen ? <MdChevronRight /> : <MdChevronLeft />}
            </div>
            {selectedEntry && (
                <div>
                    <h3>Selected Graph Information</h3>
                    <p>Type: {selectedEntry.type}</p>
                    <p>Feature: {selectedEntry.type === 'date' ? selectedEntry.key : selectedEntry.featureName}</p>
                </div>
            )}
            {data && <div className={ToolTrayStyles.uploadButtonContainer}>
                <button onClick={triggerFileInputClick}>Upload New Data</button>
                <input type="file" id="hiddenFileInput" style={{ display: 'none' }} onChange={(e) => handleFilesSelected(e.target.files[0])} />
            </div>}
            <div className={ToolTrayStyles.columnSelector}>
                <label htmlFor="columnSlider">Select Column:</label>
                <Slider
                    className="column-slider"
                    min={0}
                    max={columns.length - 1}
                    onChange={handleSliderChange}
                />
            </div>
            <div>
                <label htmlFor="toggleOutliers">Show Outliers:</label>
                <Switch
                    checked={showOutliers}
                    onChange={setShowOutliers}
                    id="toggleOutliers"
                />
            </div>
            <div className={ToolTrayStyles.exportButton}>
                <button>Export Data</button>
            </div>
        </div>
    );
}

export default ToolTray;
