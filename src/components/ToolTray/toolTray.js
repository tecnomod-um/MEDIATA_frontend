import React from 'react';
import Switch from 'react-switch';
import Slider from 'react-slider';
import ToolTrayStyles from './toolTray.module.css';

function ToolTray({ data, showOutliers, setShowOutliers, setFilteredDataStatistics, filteredDataStatistics }) {
    const columns = [];

    const handleSliderChange = (value) => {
        // TODO
    }

    return (
        <div className={ToolTrayStyles.container}>
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
    )
}

export default ToolTray;
