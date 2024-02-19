import React, { useEffect } from 'react';
// Import Chart and the required parts from chart.js
import {
    Chart,
    CategoryScale,
    LinearScale,
    BarController,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import StatisticsDisplayStyles from './statisticsDisplay.module.css';

// Register the components you are going to use
Chart.register(
    CategoryScale,
    LinearScale,
    BarController,
    BarElement,
    Title,
    Tooltip,
    Legend
);

function StatisticsDisplay({ data }) {
    useEffect(() => {
        const ctx = document.getElementById('myChart').getContext('2d');
        const myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Dataset Label',
                    data: data.values,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }, [data]);

    return (
        <div className={StatisticsDisplayStyles.chartContainer}>
            <canvas id="myChart"></canvas>
        </div>
    );
}

export default StatisticsDisplay;
