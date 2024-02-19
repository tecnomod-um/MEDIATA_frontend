import React from 'react';
import ToolTrayStyles from './toolTray.module.css';

function ToolTray() {
    return (
        <div className={ToolTrayStyles.container}>
            <div className={ToolTrayStyles.columnSelector}>
                <label htmlFor="columnSelect">Select Column:</label>
                <select id="columnSelect">
                    <option value="col1">Column 1</option>
                    <option value="col2">Column 2</option>
                </select>
            </div>
            <div className={ToolTrayStyles.exportButton}>
                <button>Export Data</button>
            </div>
        </div>
    );
}

export default ToolTray;
