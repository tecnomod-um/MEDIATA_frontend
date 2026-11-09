import React from "react";
import { render } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import ContinuousChart from "./ContinuousChart/continuousChart";
import CategoricalChart from "./CategoricalChart/categoricalChart";
import DateChart from "./DateChart/dateChart";

const chartState = vi.hoisted(() => ({ props: null, mounts: 0, update: vi.fn(), resize: vi.fn() }));
vi.mock("react-chartjs-2", async () => {
  const { forwardRef, useEffect, useImperativeHandle } = await import("react");
  const Chart = forwardRef((props, ref) => {
    chartState.props = props;
    useEffect(() => { chartState.mounts++; }, []);
    useImperativeHandle(ref, () => ({ update: chartState.update, resize: chartState.resize }), []);
    return <canvas />;
  });
  return { Bar: Chart, Line: Chart };
});
beforeEach(() => {
  chartState.mounts = 0;
  chartState.update.mockClear();
  chartState.resize.mockClear();
});

const numerical = { featureName: "Bathing", count: 12, histogram: [6, 6], binRanges: ["[0,5)", "[5,10]"], outliers: [] };
const categorical = { featureName: "Stroke Type", count: 12, categoryCounts: { A: 6, B: 6 }, missingValuesCount: 0 };
const date = { featureName: "VisitDate", dateHistogram: { "2020-01-01": 6, "2020-01-02": 6 }, outliers: [] };

it.each([
  [ContinuousChart, { feature: numerical }],
  [CategoricalChart, { feature: categorical }],
  [DateChart, { dateData: date, dateDataKey: "VisitDate" }],
])("selection leaves chart instances, data, options and resize/update work unchanged", (Component, props) => {
  const view = render(<Component {...props} inOverview showOutliers isSelected={false} />);
  const data = chartState.props.data, options = chartState.props.options;
  const updates = chartState.update.mock.calls.length;
  view.rerender(<Component {...props} inOverview showOutliers isSelected />);
  expect(chartState.props.data).toBe(data);
  expect(chartState.props.options).toBe(options);
  expect(chartState.mounts).toBe(1);
  expect(chartState.update).toHaveBeenCalledTimes(updates);
  expect(chartState.resize).not.toHaveBeenCalled();
});

