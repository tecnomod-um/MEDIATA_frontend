import React, { useRef, useEffect, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import chroma from "chroma-js";
import { generateColorList } from "../../../util/colors";
import CategoricalChartStyles from "./categoricalChart.module.css";
import { Chart as ChartJS, registerables } from "chart.js";

ChartJS.register(...registerables);

const CategoricalChart = React.memo(
  ({ feature, onClick, onDoubleClick, isSelected, inOverview }) => {
    const chartRef = useRef(null);
    const stats = useMemo(() => feature.categoryCounts || {}, [feature.categoryCounts]);

    const labels = useMemo(() =>
      Object.keys(stats).filter((k) => k !== "MissingValues"),
      [stats]
    );

    const colors = useMemo(() => generateColorList(stats), [stats]);

    const dataValues = useMemo(() =>
      labels.map((label) => stats[label]),
      [labels, stats]
    );

    const finalLabels = useMemo(() => {
      if (feature.missingValuesCount > 0)
        return [...labels, "No data"];
      return labels;
    }, [labels, feature.missingValuesCount]);

    const finalDataValues = useMemo(() => {
      if (feature.missingValuesCount > 0)
        return [...dataValues, feature.missingValuesCount];
      return dataValues;
    }, [dataValues, feature.missingValuesCount]);

    const finalColors = useMemo(() => {
      if (feature.missingValuesCount > 0)
        return [...colors, "#D3D3D3"];
      return colors;
    }, [colors, feature.missingValuesCount]);

    const chartData = useMemo(
      () => ({
        labels: finalLabels,
        datasets: [
          {
            data: finalDataValues,
            backgroundColor: finalColors,
            borderColor: finalColors.map((c) => chroma(c).darken(1.5).hex()),
            borderWidth: 1,
          },
        ],
      }),
      [finalLabels, finalDataValues, finalColors]
    );

    const chartOptions = useMemo(
      () => ({
        responsive: true,
        maintainAspectRatio: !inOverview,
        animation: true,
        indexAxis: "y",
        plugins: {
          legend: { display: false },
          title: { display: true, text: feature.featureName },
        },
        scales: {
          x: { beginAtZero: true },
          y: { ticks: { autoSkip: false } },
        },
      }),
      [feature.featureName, inOverview]
    );

    useEffect(() => {
      const handleResize = () => {
        if (chartRef.current) chartRef.current.resize();
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
      if (chartRef.current) chartRef.current.update();
    }, [chartData]);

    const containerClasses = useMemo(
      () =>
        [
          CategoricalChartStyles.chartContainer,
          inOverview ? CategoricalChartStyles.overview : "",
          isSelected ? CategoricalChartStyles.selected : "",
        ].join(" "),
      [inOverview, isSelected]
    );

    return (
      <div className={containerClasses} onClick={onClick} onDoubleClick={onDoubleClick}>
        <Bar ref={chartRef} data={chartData} options={chartOptions} />
      </div>
    );
  }
);

export default CategoricalChart;
