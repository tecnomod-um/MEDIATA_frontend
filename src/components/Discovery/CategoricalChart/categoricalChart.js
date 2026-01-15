import React, { useRef, useEffect, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import chroma from "chroma-js";
import { generateColorList } from "../../../util/colors";
import CategoricalChartStyles from "./categoricalChart.module.css";
import { Chart as ChartJS, registerables } from "chart.js";

ChartJS.register(...registerables);

const TOP_N_OVERVIEW = 8;
const TOP_N_FULL = 80;

// Helper to get CSS variable value
const getCSSVariable = (varName) => {
  if (typeof document === 'undefined') return '';
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || '';
};

// Display for the categorical features' histogram
const CategoricalChart = React.memo(
  ({ feature, onClick, onDoubleClick, isSelected, inOverview }) => {
    const chartRef = useRef(null);
    const stats = useMemo(() => feature.categoryCounts || {}, [feature.categoryCounts]);

    const { finalLabels, finalDataValues, finalColors, omittedCount, omittedTotal } = useMemo(() => {
      const entries = Object.entries(stats)
        .filter(([k]) => k !== "MissingValues")
        .map(([k, v]) => [k, Number(v || 0)]);

      entries.sort((a, b) => b[1] - a[1]);

      const topN = inOverview ? TOP_N_OVERVIEW : TOP_N_FULL;
      const top = entries.slice(0, topN);
      const rest = entries.slice(topN);

      const otherSum = rest.reduce((s, [, v]) => s + v, 0);
      const omitted = rest.length;

      const colorMap = new Map();
      const baseColors = generateColorList(stats);
      Object.keys(stats).forEach((k, i) => colorMap.set(k, baseColors[i]));

      const labels = top.map(([k]) => k);
      const values = top.map(([, v]) => v);
      const colorsLocal = top.map(([k]) => colorMap.get(k)).filter(Boolean);

      if (otherSum > 0) {
        labels.push("Other");
        values.push(otherSum);
        colorsLocal.push(getCSSVariable('--text-color-muted') || '#999999');
      }

      if (feature.missingValuesCount > 0) {
        labels.push("No data");
        values.push(feature.missingValuesCount);
        colorsLocal.push(getCSSVariable('--background-color-3') || '#D3D3D3');
      }

      return {
        finalLabels: labels,
        finalDataValues: values,
        finalColors: colorsLocal,
        omittedCount: omitted,
        omittedTotal: otherSum,
      };
    }, [stats, feature.missingValuesCount, inOverview]);

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
          title: {
            display: true,
            text:
              omittedCount > 0
                ? `${feature.featureName} (${omittedCount} categories grouped)`
                : feature.featureName,
          },
          tooltip: {
            callbacks: {
              footer: () =>
                omittedCount > 0
                  ? `Grouped into "Other": ${omittedCount} categories (total ${omittedTotal})`
                  : "",
            },
          },
        },
        scales: {
          x: { beginAtZero: true },
          y: { ticks: { autoSkip: false } },
        },
      }),
      [feature.featureName, inOverview, omittedCount, omittedTotal]
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
      <div
        className={containerClasses}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        role="button"
        tabIndex={0}
        aria-label={`Chart for ${feature.featureName}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick && onClick(e);
          }
        }}
      >
        <Bar ref={chartRef} data={chartData} options={chartOptions} />
      </div>
    );
  }
)

export default CategoricalChart;
