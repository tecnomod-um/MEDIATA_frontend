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
    const statistics = feature.categoryCounts;
    const labels = Object.keys(statistics).filter(stat => stat !== 'MissingValues');
    const colors = generateColorList(statistics);
    const borderColors = colors.map(color => chroma(color).darken(1.5).hex());

    const datasets = labels.map((label, index) => ({
        label: label,
        data: [statistics[label]],
        backgroundColor: colors[index],
        borderColor: borderColors[index],
        borderWidth: 1,
    }));

    if (feature.missingValuesCount > 0) {
        datasets.push({
            label: 'No data',
            data: [feature.missingValuesCount],
            backgroundColor: '#D3D3D3',
            borderColor: chroma('#D3D3D3').darken(1.5).hex(),
            borderWidth: 1,
        });
    }

    const chartData = {
        labels: [''],
        datasets: datasets,
    };

    const chartOptions = {
        indexAxis: 'y',
        plugins: {
            legend: {
                display: true,
                position: 'top',
            },
            title: {
                display: true,
                text: feature.featureName,
            },
        },
        scales: {
            x: {
                beginAtZero: true,
            },
            y: {
                ticks: {
                    display: false
                }
            }
        },
    };

    return (
        <div className={`${CategoricalChartStyles.chartContainer} ${isSelected ? CategoricalChartStyles.selected : ''}`} onClick={onClick}>
            <Bar data={chartData} options={chartOptions} />
        </div>
    );
}

export default CategoricalChart;
