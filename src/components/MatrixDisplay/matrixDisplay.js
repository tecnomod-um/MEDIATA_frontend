import React, { useState } from 'react';
import MatrixDisplayStyles from './matrixDisplay.module.css';

const MatrixDisplay = ({ covariances, pearsonCorrelations, spearmanCorrelations }) => {
    const [activeTab, setActiveTab] = useState('covariance');

    const renderMatrix = (stats) => {
        const keys = Object.keys(stats).sort();
        return (
            <table className={MatrixDisplayStyles.matrix}>
                <thead>
                    <tr>
                        <th className={MatrixDisplayStyles.matrixCorner}></th>
                        {keys.map(key => (
                            <th key={key} className={MatrixDisplayStyles.matrixHeader}>{key}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {keys.map(rowKey => (
                        <tr key={rowKey}>
                            <td className={MatrixDisplayStyles.matrixHeader}>{rowKey}</td>
                            {keys.map(columnKey => {
                                const value = stats[rowKey] && stats[rowKey][columnKey];
                                const isDiagonal = rowKey === columnKey;
                                return (
                                    <td
                                        key={columnKey}
                                        className={`${MatrixDisplayStyles.matrixCell} ${isDiagonal ? MatrixDisplayStyles.diagonal : ''}`}
                                    >
                                        {value !== undefined ? value.toFixed(2) : 'N/A'}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    const tabContent = {
        covariance: renderMatrix(covariances),
        pearson: renderMatrix(pearsonCorrelations),
        spearman: renderMatrix(spearmanCorrelations),
    }

    return (
        <div className={MatrixDisplayStyles.statsContainer}>
            <div className={MatrixDisplayStyles.statsBlock}>
                <select
                    className={`${MatrixDisplayStyles.statsTitle} ${MatrixDisplayStyles.selectPosition}`}
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
        </div>
    );
}

export default MatrixDisplay;
