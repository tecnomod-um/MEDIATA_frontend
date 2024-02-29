import React from 'react';
import { Bar } from 'react-chartjs-2';
import chroma from 'chroma-js';
import distinctColors from 'distinct-colors';
import CategoricalChartStyles from './categoricalChart.module.css';
import { Chart as ChartJS, registerables } from 'chart.js';
ChartJS.register(...registerables);

const generateColorList = (statistics) => {
    if (!statistics) return [];
    const colorCount = Object.keys(statistics).length;
    const palette = distinctColors({
        count: colorCount,
        chromaMin: 15,
        chromaMax: 95,
        lightMin: 65,
        lightMax: 90
    }).map(color => color.hex());

    palette.push('#D3D3D3');

    return palette;
}

function CategoricalChart({ feature, onClick, isSelected, missingEntriesText }) {
    const statistics = feature.typeStatistics;
    const labels = Object.keys(statistics).filter(stat => stat !== 'MissingValues');
    const dataPoints = labels.map(label => statistics[label]);
    if (feature.missingValuesCount > 0) {
        labels.push('No data');
        dataPoints.push(feature.missingValuesCount);
    }
    const colors = generateColorList(statistics);
    const borderColors = colors.map(color => chroma(color).darken(1.5).hex());

    const chartData = {
        labels,
        datasets: [{
            label: feature.featureName,
            data: dataPoints,
            backgroundColor: colors,
            borderColor: borderColors,
            borderWidth: 1,
        }],
    };

    const chartOptions = {
        indexAxis: 'y',
        plugins: {
            legend: {
                display: true,
                position: 'top'
            },
            title: {
                display: true,
                text: feature.featureName
            }
        },
        scales: {
            x: {
                beginAtZero: true,
            }
        }
    };

    return (
        <div className={`${CategoricalChartStyles.chartContainer} ${isSelected ? CategoricalChartStyles.selected : ''}`} onClick={onClick}>
            <Bar data={chartData} options={chartOptions} />
            {/*
            <div className={CategoricalChartStyles.statisticsInfo}>
                <p>Total Count: {feature.count}</p>
                <p>Cardinality: {feature.cardinality}</p>
                {feature.mode && (
                    <>
                        <p>Mode: {feature.mode} </p>
                        <p>Mode Frequency: {feature.modeFrequency} ({feature.modeFrequencyPercentage.toFixed(2)}%)</p>
                    </>
                )}
                <p>{missingEntriesText}</p>
            </div>
                */}
        </div>
    );
}

export default CategoricalChart;

