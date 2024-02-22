import React from 'react';
import { Bar, Pie, Line } from 'react-chartjs-2';
import StatisticsDisplayStyles from './statisticsDisplay.module.css';
import distinctColors from 'distinct-colors';
import chroma from 'chroma-js';
import { Chart as ChartJS, registerables } from 'chart.js';
import 'chartjs-adapter-moment';

ChartJS.register(...registerables);

function StatisticsDisplay({ data, showOutliers }) {
    console.log(data)

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

    const renderContinuousChart = (feature, key) => {
        let labels = Array.from({ length: data.histograms[feature.featureName].length }, (_, i) => `Bin ${i + 1}`);
        let dataPoints = data.histograms[feature.featureName];
    
        if (!showOutliers && feature.statistics.Outliers) {
            const outliersSet = new Set(feature.statistics.Outliers);
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
        }

        const chartOptions = {
            scales: {
                y: { beginAtZero: true },
            },
            plugins: {
                legend: { display: false },
                title: { display: true, text: feature.featureName }
            }
        }

        return (
            <div key={key} className={StatisticsDisplayStyles.chartContainer}>
                <Bar data={chartData} options={chartOptions} />
                <div className={StatisticsDisplayStyles.statisticsInfo}>
                    <p>Count: {feature.statistics.Count}</p>
                    <p>Mean: {feature.statistics.Mean.toFixed(2)}</p>
                    <p>Standard Deviation: {feature.statistics.StdDev.toFixed(2)}</p>
                    <p>Min: {feature.statistics.Min}</p>
                    <p>Max: {feature.statistics.Max}</p>
                    <p>Missing Values: {feature.missingValuesCount}</p>
                </div>
            </div>
        );
    }

    const renderCategoricalChart = (feature, key) => {
        const { MissingValues, ...cleanedStatistics } = feature.statistics;
        const labels = Object.keys(cleanedStatistics);
        const dataPoints = Object.values(cleanedStatistics);

        if (MissingValues !== undefined) {
            labels.push('No data');
            dataPoints.push(MissingValues);
        }

        const colors = generateColorList(cleanedStatistics);
        const borderColors = colors.map(color => chroma(color).darken(1.5).hex());

        const chartData = {
            labels,
            datasets: [{
                data: dataPoints,
                backgroundColor: colors,
                borderColor: borderColors,
                borderWidth: 1,
            }],
        }

        const chartOptions = {
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: feature.featureName }
            }
        }

        return (
            <div key={key} className={StatisticsDisplayStyles.chartContainer}>
                <Pie data={chartData} options={chartOptions} />
                <div className={StatisticsDisplayStyles.statisticsInfo}>
                    <p>Total Count: {feature.count}</p>
                    <p>Missing Entries: {MissingValues || 0}</p>
                </div>
            </div>
        )
    }

    const renderDateChart = (dateDataKey) => {
        const dateData = data.dateStatistics[dateDataKey];
        const sortedEntries = Object.entries(dateData.dateHistogram).sort((a, b) => new Date(a[0]) - new Date(b[0]));
        const chartData = {
            labels: sortedEntries.map(([date, _]) => date),
            datasets: [{
                label: 'Date Distribution',
                data: sortedEntries.map(([_, count]) => count),
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                fill: false,
            }],
        }

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        parser: 'YYYY-MM-DD',
                        unit: 'year',
                        displayFormats: {
                            year: 'YYYY'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    },
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 20
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count'
                    }
                }
            },
            plugins: {
                legend: { display: false },
                title: { display: true, text: `${dateDataKey} Distribution Over Time` }
            },
            elements: {
                line: {
                    tension: 0
                },
                point: {
                    radius: 0
                }
            }
        }

        return (
            <div key={dateDataKey} className={StatisticsDisplayStyles.chartContainer} style={{ maxWidth: '100%' }}>
                <Line data={chartData} options={chartOptions} />
                <div className={StatisticsDisplayStyles.statisticsInfo}>
                    <p>Total Count: {dateData.count}</p>
                    <p>Missing Values: {dateData.missingValuesCount}</p>
                    <p>Earliest Date: {dateData.earliestDate}</p>
                    <p>Latest Date: {dateData.latestDate}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={StatisticsDisplayStyles.chartFlexContainer}>
            {data.continuousFeatures?.map((feature, index) => renderContinuousChart(feature, `continuous-${index}`))}
            {data.categoricalFeatures?.map((feature, index) => renderCategoricalChart(feature, `categorical-${index}`))}
            {data.dateStatistics ? Object.keys(data.dateStatistics).map((key, index) => renderDateChart(key, `date-${index}`)) : null}
        </div>
    )
}

export default StatisticsDisplay;
