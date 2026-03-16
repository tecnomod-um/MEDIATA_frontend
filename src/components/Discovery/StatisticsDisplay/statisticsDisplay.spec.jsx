import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import StatisticsDisplay from "./statisticsDisplay";

vi.mock("../ContinuousChart/continuousChart", () => ({
  __esModule: true,
  default: (props) => {
    const isOverview = !!props.inOverview || typeof props.onClick === "function";
    const scope = isOverview ? "Overview " : "Preview ";
    return (
      <div
        role="figure"
        aria-label={`${scope}Continuous chart for ${props.feature.featureName}`}
        data-feature={props.feature.featureName}
        data-selected={props.isSelected ? "true" : "false"}
        onClick={props.onClick}
        onDoubleClick={props.onDoubleClick}
      />
    );
  },
}));

vi.mock("../CategoricalChart/categoricalChart", () => ({
  __esModule: true,
  default: (props) => {
    const isOverview = !!props.inOverview || typeof props.onClick === "function";
    const scope = isOverview ? "Overview " : "Preview ";
    return (
      <div
        role="figure"
        aria-label={`${scope}Categorical chart for ${props.feature.featureName}`}
        data-feature={props.feature.featureName}
        data-selected={props.isSelected ? "true" : "false"}
        onClick={props.onClick}
        onDoubleClick={props.onDoubleClick}
      />
    );
  },
}));

vi.mock("../DateChart/dateChart", () => ({
  __esModule: true,
  default: (props) => {
    const isOverview = !!props.inOverview || typeof props.onClick === "function";
    const scope = isOverview ? "Overview " : "Preview ";
    return (
      <div
        role="figure"
        aria-label={`${scope}Date chart for ${props.dateData.featureName}`}
        data-feature={props.dateData.featureName}
        data-selected={props.isSelected ? "true" : "false"}
        onClick={props.onClick}
        onDoubleClick={props.onDoubleClick}
      />
    );
  },
}));

vi.mock("../EntrySearch/entrySearch", () => ({
  __esModule: true,
  default: (props) => (
    <div
      role="table"
      aria-label={`${props.type} data table`}
      data-type={props.type}
      data-result={JSON.stringify(props.resultData)}
      onClick={() => props.onRowSelect?.("row-1")}
    />
  ),
}));

vi.mock("../ChartPreview/chartPreview", () => ({
  __esModule: true,
  default: ({ isOpen, content, closeModal }) =>
    isOpen ? (
      <div role="dialog" aria-label="Chart preview">
        <button aria-label="Close preview" onClick={closeModal}>
          Close
        </button>
        <div>{content}</div>
      </div>
    ) : null,
}));

vi.mock("./statisticsDisplay.module.css", () => ({
  __esModule: true,
  default: {},
}));

describe("<StatisticsDisplay />", () => {
  const continuousFeatures = [
    {
      featureName: "A",
      count: 5,
      mean: 1,
      stdDev: 0.1,
      min: 0,
      qrt1: 0.5,
      median: 1,
      qrt3: 1.5,
      max: 2,
      missingValuesCount: 1,
    },
    {
      featureName: "B",
      count: 2,
      mean: 2,
      stdDev: 0.2,
      min: 1,
      qrt1: 1.5,
      median: 2,
      qrt3: 2.5,
      max: 3,
      missingValuesCount: 0,
    },
  ];

  const categoricalFeatures = [
    {
      featureName: "C",
      count: 3,
      mode: "x",
      modeFrequency: 2,
      modeFrequencyPercentage: 66.67,
      secondMode: "y",
      secondModeFrequency: 1,
      secondModePercentage: 33.33,
      missingValuesCount: 0,
    },
  ];

  const dateFeatures = [
    {
      featureName: "D",
      count: 4,
      earliestDate: "2020-01-01",
      q1: "2020-01-02",
      median: "2020-01-03",
      q3: "2020-01-04",
      latestDate: "2020-01-05",
      missingValuesCount: 1,
    },
  ];

  const data = { continuousFeatures, categoricalFeatures, dateFeatures };

  let setSelectedEntry;

  beforeEach(() => {
    setSelectedEntry = vi.fn();
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  test("charts render in ascending count order", () => {
    render(
      <StatisticsDisplay
        data={data}
        showOutliers={true}
        setSelectedEntry={setSelectedEntry}
        selectedEntry={null}
      />
    );

    const charts = screen.getAllByRole("figure");

    const contCharts = charts.filter((chart) =>
      chart.getAttribute("aria-label")?.includes("Continuous chart for")
    );
    expect(contCharts[0]).toHaveAttribute("data-feature", "B");
    expect(contCharts[1]).toHaveAttribute("data-feature", "A");

    const catCharts = charts.filter((chart) =>
      chart.getAttribute("aria-label")?.includes("Categorical chart for")
    );
    expect(catCharts).toHaveLength(1);
    expect(catCharts[0]).toHaveAttribute("data-feature", "C");

    const dCharts = charts.filter((chart) =>
      chart.getAttribute("aria-label")?.includes("Date chart for")
    );
    expect(dCharts).toHaveLength(1);
    expect(dCharts[0]).toHaveAttribute("data-feature", "D");
  });

  test("clicking a chart calls setSelectedEntry", () => {
    render(
      <StatisticsDisplay
        data={data}
        showOutliers={false}
        setSelectedEntry={setSelectedEntry}
        selectedEntry={null}
      />
    );

    const firstCont = screen.getByLabelText("Overview Continuous chart for B");
    fireEvent.click(firstCont);

    expect(setSelectedEntry).toHaveBeenCalledWith({
      type: "continuous",
      featureName: "B",
    });
  });

  test("renders two EntrySearchs with correct types & data", () => {
    render(
      <StatisticsDisplay
        data={data}
        showOutliers={false}
        setSelectedEntry={setSelectedEntry}
        selectedEntry={null}
      />
    );

    const searches = screen.getAllByRole("table");
    expect(searches).toHaveLength(2);

    expect(searches[0]).toHaveAttribute("data-type", "continuous");
    const contResult = JSON.parse(searches[0].getAttribute("data-result"));
    expect(contResult.Name).toEqual(["A", "B", "D"]);
    expect(contResult.Count).toEqual(["5", "2", "4"]);

    expect(searches[1]).toHaveAttribute("data-type", "categorical");
    const catResult = JSON.parse(searches[1].getAttribute("data-result"));
    expect(catResult.Name).toEqual(["C"]);
    expect(catResult["Total Count"]).toEqual(["3"]);
  });

  test("double-click opens the preview with correct content and can be closed", () => {
    render(
      <StatisticsDisplay
        data={data}
        showOutliers={true}
        setSelectedEntry={setSelectedEntry}
        selectedEntry={null}
      />
    );

    const cont = screen.getByLabelText("Overview Continuous chart for B");
    fireEvent.doubleClick(cont);

    expect(
      screen.getByRole("dialog", { name: "Chart preview" })
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Preview Continuous chart for B")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Close preview"));
    expect(screen.queryByRole("dialog", { name: "Chart preview" })).toBeNull();
  });

  test("double-click on categorical chart opens preview", () => {
    render(
      <StatisticsDisplay
        data={data}
        showOutliers={false}
        setSelectedEntry={setSelectedEntry}
        selectedEntry={null}
      />
    );

    const catChart = screen.getByLabelText("Overview Categorical chart for C");
    fireEvent.doubleClick(catChart);

    expect(
      screen.getByRole("dialog", { name: "Chart preview" })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Preview Categorical chart for C")
    ).toBeInTheDocument();
  });

  test("double-click on date chart opens preview", () => {
    render(
      <StatisticsDisplay
        data={data}
        showOutliers={true}
        setSelectedEntry={setSelectedEntry}
        selectedEntry={null}
      />
    );

    const dateChart = screen.getByLabelText("Overview Date chart for D");
    fireEvent.doubleClick(dateChart);

    expect(
      screen.getByRole("dialog", { name: "Chart preview" })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Preview Date chart for D")
    ).toBeInTheDocument();
  });

  test("does not open preview on mobile (small window)", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 500,
    });

    render(
      <StatisticsDisplay
        data={data}
        showOutliers={true}
        setSelectedEntry={setSelectedEntry}
        selectedEntry={null}
      />
    );

    const cont = screen.getByLabelText("Overview Continuous chart for B");
    fireEvent.doubleClick(cont);

    expect(
      screen.queryByRole("dialog", { name: "Chart preview" })
    ).not.toBeInTheDocument();
  });

  test("clicking categorical chart calls setSelectedEntry", () => {
    render(
      <StatisticsDisplay
        data={data}
        showOutliers={false}
        setSelectedEntry={setSelectedEntry}
        selectedEntry={null}
      />
    );

    const catChart = screen.getByLabelText("Overview Categorical chart for C");
    fireEvent.click(catChart);

    expect(setSelectedEntry).toHaveBeenCalledWith({
      type: "categorical",
      featureName: "C",
    });
  });

  test("clicking date chart calls setSelectedEntry", () => {
    render(
      <StatisticsDisplay
        data={data}
        showOutliers={false}
        setSelectedEntry={setSelectedEntry}
        selectedEntry={null}
      />
    );

    const dateChart = screen.getByLabelText("Overview Date chart for D");
    fireEvent.click(dateChart);

    expect(setSelectedEntry).toHaveBeenCalledWith({
      type: "continuous",
      featureName: "D",
    });
  });

  test("marks categorical chart as selected", () => {
    render(
      <StatisticsDisplay
        data={data}
        showOutliers={false}
        setSelectedEntry={setSelectedEntry}
        selectedEntry={{ type: "categorical", featureName: "C" }}
      />
    );

    const catChart = screen.getByLabelText("Overview Categorical chart for C");
    expect(catChart).toHaveAttribute("data-selected", "true");
  });

  test("marks date chart as selected", () => {
    render(
      <StatisticsDisplay
        data={data}
        showOutliers={false}
        setSelectedEntry={setSelectedEntry}
        selectedEntry={{ type: "continuous", featureName: "D" }}
      />
    );

    const dateChart = screen.getByLabelText("Overview Date chart for D");
    expect(dateChart).toHaveAttribute("data-selected", "true");
  });

  test("formats missing entries correctly with percentage", () => {
    const dataWithMissing = {
      continuousFeatures: [
        {
          featureName: "A",
          count: 100,
          mean: 1,
          stdDev: 0.1,
          min: 0,
          qrt1: 0.5,
          median: 1,
          qrt3: 1.5,
          max: 2,
          missingValuesCount: 25,
        },
      ],
      categoricalFeatures: [],
      dateFeatures: [],
    };

    render(
      <StatisticsDisplay
        data={dataWithMissing}
        showOutliers={false}
        setSelectedEntry={setSelectedEntry}
        selectedEntry={null}
      />
    );

    const searches = screen.getAllByRole("table");
    const contResult = JSON.parse(searches[0].getAttribute("data-result"));
    expect(contResult["Missing Entries"]).toEqual(["25 (25.00%)"]);
  });

  test("formats missing entries as 0 (0%) when no missing values", () => {
    const dataNoMissing = {
      continuousFeatures: [
        {
          featureName: "A",
          count: 100,
          mean: 1,
          stdDev: 0.1,
          min: 0,
          qrt1: 0.5,
          median: 1,
          qrt3: 1.5,
          max: 2,
          missingValuesCount: 0,
        },
      ],
      categoricalFeatures: [],
      dateFeatures: [],
    };

    render(
      <StatisticsDisplay
        data={dataNoMissing}
        showOutliers={false}
        setSelectedEntry={setSelectedEntry}
        selectedEntry={null}
      />
    );

    const searches = screen.getAllByRole("table");
    const contResult = JSON.parse(searches[0].getAttribute("data-result"));
    expect(contResult["Missing Entries"]).toEqual(["0 (0%)"]);
  });

  test("handles date features with stdDev", () => {
    const dataWithDateStdDev = {
      continuousFeatures: [],
      categoricalFeatures: [],
      dateFeatures: [
        {
          featureName: "DateWithStdDev",
          count: 10,
          earliestDate: "2020-01-01",
          q1: "2020-01-02",
          median: "2020-01-03",
          q3: "2020-01-04",
          latestDate: "2020-01-05",
          missingValuesCount: 0,
          stdDev: 5.5,
          mean: "2020-01-03",
        },
      ],
    };

    render(
      <StatisticsDisplay
        data={dataWithDateStdDev}
        showOutliers={false}
        setSelectedEntry={setSelectedEntry}
        selectedEntry={null}
      />
    );

    const searches = screen.getAllByRole("table");
    const contResult = JSON.parse(searches[0].getAttribute("data-result"));
    expect(contResult["Std. Dev."]).toContain("5.50");
  });
});