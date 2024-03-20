import React from 'react';
import { Bar } from 'react-chartjs-2';
import ContinuousChartStyles from './continuousChart.module.css';
import { Chart as ChartJS, registerables } from 'chart.js';
ChartJS.register(...registerables);

function ContinuousChart({ feature, showOutliers, onClick, isSelected, missingEntriesText }) {
    let histogram = feature.histogram;
    let binRanges = feature.binRanges || [];

    let labels = histogram ? Array.from({ length: histogram.length }, (_, i) => binRanges[i]) : [];
    let dataPoints = histogram || [];

    if (!showOutliers) {
        const outliersSet = new Set(feature.outliers);
        labels = labels.filter((_, index) => !outliersSet.has(dataPoints[index]));
        dataPoints = dataPoints.filter(value => !outliersSet.has(value));
    }

    const chartData = {
        labels,
        datasets: [{
            label: feature.featureName,
            data: dataPoints,
            backgroundColor: 'rgba(255, 159, 64, 0.2)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1,
        }],
    };

    const chartOptions = {
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

    return (
        <div
            className={`${ContinuousChartStyles.chartContainer} ${isSelected ? ContinuousChartStyles.selected : ''}`} onClick={onClick}>
            <Bar data={chartData} options={chartOptions} />
            {/*
            <div className={ContinuousChartStyles.statisticsInfo}>
                <p>Count: {feature.count}</p>
                <p>Mean: {feature.typeStatistics.Mean.toFixed(2)}</p>
                <p>Standard Deviation: {feature.typeStatistics.StdDev.toFixed(2)}</p>
                <p>Min: {feature.typeStatistics.Min}</p>
                <p>Max: {feature.typeStatistics.Max}</p>
                <p>First Quartile (Q1): {feature.typeStatistics.Qrt1.toFixed(2)}</p>
                <p>Median: {feature.typeStatistics.Median.toFixed(2)}</p>
                <p>Third Quartile (Q3): {feature.typeStatistics.Qrt3.toFixed(2)}</p>
                <p>{missingEntriesText}</p>
            
        </div>
        */}
        </div >
    );
}

export default ContinuousChart;