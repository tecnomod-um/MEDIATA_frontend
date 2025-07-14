import React, { useRef, useEffect, useMemo } from "react";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-moment";
import DateChartStyles from "./dateChart.module.css";
import { Chart as ChartJS, registerables } from "chart.js";

ChartJS.register(...registerables);

function DateChart({
  dateData,
  dateDataKey,
  showOutliers,
  onClick,
  onDoubleClick,
  isSelected,
}) {
  const chartRef = useRef(null);

  const sortedEntries = useMemo(
    () =>
      Object.entries(dateData.dateHistogram).sort(
        (a, b) => new Date(a[0]) - new Date(b[0])
      ),
    [dateData.dateHistogram]
  );

  const outlierDatesSet = useMemo(
    () => new Set(dateData.outliers),
    [dateData.outliers]
  );

  const labels = useMemo(() => {
    if (!showOutliers)
      return sortedEntries
        .filter(([date]) => !outlierDatesSet.has(date))
        .map(([date]) => date);
    return sortedEntries.map(([date]) => date);
  }, [showOutliers, sortedEntries, outlierDatesSet]);

  const chartDataPoints = useMemo(() => {
    if (!showOutliers) {
      return sortedEntries
        .filter(([date]) => !outlierDatesSet.has(date))
        .map(([, count]) => count);
    }
    return sortedEntries.map(([, count]) => count);
  }, [showOutliers, sortedEntries, outlierDatesSet]);

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Date Distribution",
          data: chartDataPoints,
          backgroundColor: "rgba(54, 162, 235, 0.5)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
          fill: false,
        },
      ],
    }),
    [labels, chartDataPoints]
  );

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    animation: true,
    scales: {
      x: {
        type: "time",
        time: {
          parser: "YYYY-MM-DD",
          unit: "year",
          displayFormats: {
            year: "YYYY",
          },
        },
        title: {
          display: true,
          text: "Date",
        },
        ticks: {
          autoSkip: true,
          maxTicksLimit: 20,
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Count",
        },
      },
    },
    plugins: {
      legend: { display: false },
      title: { display: true, text: `${dateDataKey} Distribution Over Time` },
    },
    elements: {
      line: {
        tension: 0,
      },
      point: {
        radius: 0,
      },
    },
  };

  useEffect(() => {
    const handleResize = () => {
      const chart = chartRef.current;
      if (chart) chart.resize();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (chart) {
      chart.update();
    }
  }, [chartData]);

  return (
    <div
      className={`${DateChartStyles.chartContainer} ${
        isSelected ? DateChartStyles.selected : ""
      }`}
      onClick={onClick}
      style={{ maxWidth: "100%" }}
      onDoubleClick={onDoubleClick}
    >
      <Line ref={chartRef} data={chartData} options={chartOptions} />
    </div>
  );
}

export default DateChart;
