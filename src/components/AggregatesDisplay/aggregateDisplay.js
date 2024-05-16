import React, { useState, useEffect, useRef } from 'react';
import AggregateDisplayStyles from './aggregateDisplay.module.css';

const AggregateDisplay = ({ covariances, pearsonCorrelations, spearmanCorrelations, chiSquareTest }) => {
    const [activeTab, setActiveTab] = useState('covariance');
    const selectRef = useRef(null);
    const matrixRef = useRef(null);
    
    useEffect(() => {
        const updateSelectWidth = () => {
            if (matrixRef.current && selectRef.current) {
                const firstHeaderCell = matrixRef.current.querySelector('th');
                if (firstHeaderCell) {
                    selectRef.current.style.width = `${firstHeaderCell.offsetWidth}px`;
                }
            }
        };

        updateSelectWidth();
        window.addEventListener('resize', updateSelectWidth);
        return () => window.removeEventListener('resize', updateSelectWidth);
    }, []);
    
    const renderMatrix = (stats) => {
        const keys = Object.keys(stats).sort();
        return (
            <table ref={matrixRef} className={AggregateDisplayStyles.matrix}>
                <thead>
                    <tr>
                        <th className={AggregateDisplayStyles.matrixCorner}></th>
                        {keys.map(key => (
                            <th key={key} className={AggregateDisplayStyles.matrixHeader}>{key}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {keys.map(rowKey => (
                        <tr key={rowKey}>
                            <td className={AggregateDisplayStyles.matrixHeader}>{rowKey}</td>
                            {keys.map(columnKey => (
                                <td key={columnKey} className={`${AggregateDisplayStyles.matrixCell} ${rowKey === columnKey ? AggregateDisplayStyles.diagonal : ''}`}>
                                    {stats[rowKey] && stats[rowKey][columnKey] !== undefined ? stats[rowKey][columnKey].toFixed(2) : 'N/A'}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    const renderChiSquaredResults = () => {
        return (
            <div className={AggregateDisplayStyles.chiSquaredResultsContainer}>
                {Object.entries(chiSquareTest).map(([testName, testValue]) => (
                    <div key={testName}>
                        <strong>{testName}: </strong>{testValue.toExponential(3)}
                    </div>
                ))}
            </div>
        );
    }

    const tabContent = {
        covariance: renderMatrix(covariances),
        pearson: renderMatrix(pearsonCorrelations),
        spearman: renderMatrix(spearmanCorrelations),
    }

    return (
        <div className={AggregateDisplayStyles.statsContainer}>
            <div className={AggregateDisplayStyles.statsBlock}>
                <select
                    ref={selectRef}
                    className={`${AggregateDisplayStyles.statsTitle} ${AggregateDisplayStyles.selectPosition}`}
                    value={activeTab}
                    onChange={(e) => setActiveTab(e.target.value)}
                >
                    {Object.keys(tabContent).map((tabKey) => (
                        <option key={tabKey} value={tabKey}>
                            {tabKey.charAt(0).toUpperCase() + tabKey.slice(1)}
                        </option>
                    ))}
                </select>
                {tabContent[activeTab]}
            </div>
            <div className={AggregateDisplayStyles.chiSquaredResults}>
                <div className={AggregateDisplayStyles.chiSquaredLabel}>Chi-Squared Tests:</div>
                {renderChiSquaredResults()}
            </div>
        </div>
    );
}

export default AggregateDisplay;
