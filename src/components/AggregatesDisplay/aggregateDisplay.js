import React, { useState, useRef, useEffect } from 'react';
import AggregateDisplayStyles from './aggregateDisplay.module.css';

const AggregateDisplay = ({ covariances, pearsonCorrelations, spearmanCorrelations, chiSquareTest }) => {
    const [activeTab, setActiveTab] = useState('covariance');
    const matrixRef = useRef(null);
    const selectRef = useRef(null);
    
    useEffect(() => {
        const updateSelectPositionAndSize = () => {
            const matrix = matrixRef.current;
            if (matrix && selectRef.current) {
                const matrixRect = matrix.getBoundingClientRect();
                const firstRowHeader = matrix.querySelector('th:first-child');
                if (firstRowHeader) {
                    const headerRect = firstRowHeader.getBoundingClientRect();
                    selectRef.current.style.top = `${matrixRect.top}px`;
                    selectRef.current.style.left = `${matrixRect.left}px`;
                    selectRef.current.style.width = `${headerRect.width}px`;
                }
            }
        }
    
        updateSelectPositionAndSize();
        window.addEventListener('resize', updateSelectPositionAndSize);
        return () => window.removeEventListener('resize', updateSelectPositionAndSize);
    
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
