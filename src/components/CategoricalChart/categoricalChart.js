import React, { useRef, useEffect, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import chroma from 'chroma-js';
import distinctColors from 'distinct-colors';
import categoricalChartStyles from './categoricalChart.module.css';
import { Chart as ChartJS, registerables } from 'chart.js';

ChartJS.register(...registerables);

console.log(distinctColors)
console.log(chroma)
const generateColorList = (statistics) => {
    const colorCount = statistics ? Object.keys(statistics).length : 0;
    return distinctColors({
        count: colorCount,
        chromaMin: 15,
        chromaMax: 95,
        lightMin: 65,
        lightMax: 90
    }).map(color => color.hex()).concat('#D3D3D3');
}

const getChartSizeClass = (categoryCount) => {
    if (categoryCount <= 10) return categoricalChartStyles.small;
    if (categoryCount <= 20) return categoricalChartStyles.medium;
    return categoricalChartStyles.large;
}

const CategoricalChart = ({ feature, onClick, isSelected, onDoubleClick }) => {
    const chartRef = useRef(null);
    const statistics = feature.categoryCounts;
    const labels = Object.keys(statistics).filter(stat => stat !== 'MissingValues');
    const colors = generateColorList(statistics);
    const chartSizeClass = getChartSizeClass(labels.length);

    const dataValues = labels.map(label => statistics[label]);
    if (feature.missingValuesCount > 0) {
        labels.push('No data');
        dataValues.push(feature.missingValuesCount);
        colors.push('#D3D3D3');
    }

    const chartData = useMemo(() => ({
        labels,
        datasets: [{
            data: dataValues,
            backgroundColor: colors,
            borderColor: colors.map(color => chroma(color).darken(1.5).hex()),
            borderWidth: 1,
        }],
    }), [labels, dataValues, colors]);

    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: true,
        indexAxis: 'y',
        plugins: {
            legend: {
                display: false,
                position: 'right',
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
                    autoSkip: false,
                },
            },
        },
    }), [feature.featureName]);

    useEffect(() => {
        const handleResize = () => {
            const chart = chartRef.current;
            if (chart) chart.resize();
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        const chart = chartRef.current;
        if (chart) chart.update();
    }, [chartData]);

    const selectedClass = chartSizeClass === categoricalChartStyles.large ? categoricalChartStyles.selectedLarge : categoricalChartStyles.selected;

    return (
        <div
            className={`${categoricalChartStyles.chartContainer} ${chartSizeClass} ${isSelected ? selectedClass : ''}`}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
        >
            <Bar ref={chartRef} data={chartData} options={chartOptions} />
        </div>
    );
}

export default CategoricalChart;
