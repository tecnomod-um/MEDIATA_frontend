import React, { useRef, useEffect, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import ContinuousChartStyles from './continuousChart.module.css';
import { Chart as ChartJS, registerables } from 'chart.js';

ChartJS.register(...registerables);

function ContinuousChart({ feature, showOutliers, onClick, onDoubleClick, isSelected, missingEntriesText }) {
    const chartRef = useRef(null);
    let histogram = feature.histogram;

    const binRanges = useMemo(() => feature.binRanges || [], [feature.binRanges]);

    const labels = useMemo(() => (
        histogram ? Array.from({ length: histogram.length }, (_, i) => binRanges[i]) : []
    ), [histogram, binRanges]);

    const dataPoints = useMemo(() => (
        histogram || []
    ), [histogram]);

    const filteredLabels = useMemo(() => {
        if (!showOutliers) {
            const outliersSet = new Set(feature.outliers);
            return labels.filter((_, index) => !outliersSet.has(dataPoints[index]));
        }
        return labels;
    }, [showOutliers, labels, dataPoints, feature.outliers]);

    const filteredDataPoints = useMemo(() => {
        if (!showOutliers) {
            const outliersSet = new Set(feature.outliers);
            return dataPoints.filter(value => !outliersSet.has(value));
        }
        return dataPoints;
    }, [showOutliers, dataPoints, feature.outliers]);

    const chartData = useMemo(() => ({
        labels: filteredLabels,
        datasets: [{
            label: feature.featureName,
            data: filteredDataPoints,
            backgroundColor: 'rgba(255, 159, 64, 0.2)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1,
        }],
    }), [filteredLabels, filteredDataPoints, feature.featureName]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: true,
        animation: false,
        scales: {
            y: { beginAtZero: true },
        },
        plugins: {
            legend: { display: false },
            title: { display: true, text: feature.featureName },
            tooltip: {
                callbacks: {
                    title: function (tooltipItems) {
                        const labelIndex = tooltipItems[0].dataIndex;
                        return binRanges[labelIndex] || '';
                    },
                    label: function (tooltipItem) {
                        return null;
                    }
                }
            }
        }
    }

    useEffect(() => {
        const chart = chartRef.current;
        if (chart) {
            chart.update();
        }
    }, [chartData]);

    return (
        <div
            className={`${ContinuousChartStyles.chartContainer} ${isSelected ? ContinuousChartStyles.selected : ''}`}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
        >
            <Bar ref={chartRef} data={chartData} options={chartOptions} />
        </div>
    );
}

export default ContinuousChart;
