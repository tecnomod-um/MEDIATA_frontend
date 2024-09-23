import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './elementExporter.module.css';

function ElementExporter({ data }) {
    const navigate = useNavigate();

    const generateCSV = ({ categoricalFeatures = [], continuousFeatures = [], dateFeatures = [], omittedFeatures = [] }) => {
        const rows = [
            ...categoricalFeatures?.map(feature => `${feature.featureName},${Object.keys(feature.categoryCounts).join(',')}`),
            ...continuousFeatures?.map(feature => `${feature.featureName},integer`),
            ...dateFeatures?.map(feature => `${feature.featureName},date`),
            ...omittedFeatures?.map(feature => `${feature.featureName},Natural Language`),
        ]
        return rows.join('\n');
    }

    const handleSmallButtonClick = () => {
        const csvString = generateCSV(data);
        navigate('/rdfparser', { state: { csvData: csvString } });
    }

    return (
        <div className={styles.exportContainer}>
            <button className={styles.exportButton} onClick={handleSmallButtonClick}>
                Export Elements
            </button>
            <button
                onClick={handleSmallButtonClick}
                className={styles.smallGreenButton}
            >
                ➔
            </button>
        </div>
    )
}

export default ElementExporter;
