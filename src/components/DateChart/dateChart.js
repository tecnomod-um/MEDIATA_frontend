import React from 'react';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-moment';
import DateChartStyles from './dateChart.module.css';
import { Chart as ChartJS, registerables } from 'chart.js';
ChartJS.register(...registerables);

function DateChart({ dateData, dateDataKey, showOutliers, onClick, onDoubleClick , isSelected, missingEntriesText }) {
    const sortedEntries = Object.entries(dateData.dateHistogram).sort((a, b) => new Date(a[0]) - new Date(b[0]));
    const outlierDatesSet = new Set(dateData.outliers);

    let labels = [];
    let chartDataPoints = [];
    if (!showOutliers) {
        sortedEntries.forEach(([date, count]) => {
            if (!outlierDatesSet.has(date)) {
                labels.push(date);
                chartDataPoints.push(count);
            }
        });
    } else {
        labels = sortedEntries.map(([date, _]) => date);
        chartDataPoints = sortedEntries.map(([_, count]) => count);
    }

    const chartData = {
        labels,
        datasets: [{
            label: 'Date Distribution',
            data: chartDataPoints,
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
    };

    return (
        <div
            className={`${DateChartStyles.chartContainer} ${isSelected ? DateChartStyles.selected : ''}`}
            onClick={onClick}
            style={{ maxWidth: '100%' }}
            onDoubleClick={onDoubleClick}
        >
            <Line data={chartData} options={chartOptions} />
            {/*
            <div className={DateChartStyles.statisticsInfo}>
                <p>Total Count: {dateData.count}</p>
                <p>{missingEntriesText}</p>
                <p>Earliest Date: {dateData.earliestDate}</p>
                <p>Latest Date: {dateData.latestDate}</p>
                <p>Mean Date: {dateData.mean}</p>
                <p>Standard Deviation (Days): {dateData.stdDev.toFixed(2)}</p>
                <p>Median Date: {dateData.median}</p>
                <p>First Quartile (Q1) Date: {dateData.q1}</p>
                <p>Third Quartile (Q3) Date: {dateData.q3}</p>
            </div>
    */}
        </div>
    );
}

export default DateChart;
