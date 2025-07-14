import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import StatisticsDisplay from "./statisticsDisplay";

jest.mock("../ContinuousChart/continuousChart", () => props => (
  <div
    data-testid="continuous-chart"
    data-feature={props.feature.featureName}
    data-selected={props.isSelected ? "true" : "false"}
    onClick={props.onClick}
    onDoubleClick={props.onDoubleClick}
  />
));

jest.mock("../CategoricalChart/categoricalChart", () => props => (
  <div
    data-testid="categorical-chart"
    data-feature={props.feature.featureName}
    data-selected={props.isSelected ? "true" : "false"}
    onClick={props.onClick}
    onDoubleClick={props.onDoubleClick}
  />
));

jest.mock("../DateChart/dateChart", () => props => (
  <div
    data-testid="date-chart"
    data-feature={props.dateData.featureName}
    data-selected={props.isSelected ? "true" : "false"}
    onClick={props.onClick}
    onDoubleClick={props.onDoubleClick}
  />
));

jest.mock("../EntrySearch/entrySearch", () => props => (
  <div
    data-testid="entry-search"
    data-type={props.type}
    data-result={JSON.stringify(props.resultData)}
    onClick={() => props.onRowSelect("row-1")}
  />
));

jest.mock("../ChartPreview/chartPreview", () => ({ isOpen, content, closeModal }) =>
  isOpen ? (
    <div data-testid="chart-preview">
      <button data-testid="close-preview" onClick={closeModal}>
        Close
      </button>
      <div data-testid="preview-content">{content}</div>
    </div>
  ) : null
);

jest.mock("./statisticsDisplay.module.css", () => ({}));

describe("<StatisticsDisplay />", () => {
  const continuousFeatures = [
    { featureName: "A", count: 5, mean: 1, stdDev: 0.1, min: 0, qrt1: 0.5, median: 1, qrt3: 1.5, max: 2, missingValuesCount: 1 },
    { featureName: "B", count: 2, mean: 2, stdDev: 0.2, min: 1, qrt1: 1.5, median: 2, qrt3: 2.5, max: 3, missingValuesCount: 0 },
  ];
  const categoricalFeatures = [
    { featureName: "C", count: 3, mode: "x", modeFrequency: 2, modeFrequencyPercentage: 66.67, secondMode: "y", secondModeFrequency: 1, secondModePercentage: 33.33, missingValuesCount: 0 },
  ];
  const dateFeatures = [
    { featureName: "D", count: 4, earliestDate: "2020-01-01", q1: "2020-01-02", median: "2020-01-03", q3: "2020-01-04", latestDate: "2020-01-05", missingValuesCount: 1 },
  ];
  const data = { continuousFeatures, categoricalFeatures, dateFeatures };

  let setSelectedEntry;
  beforeEach(() => {
    setSelectedEntry = jest.fn();
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

    const searches = screen.getAllByTestId("entry-search");
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

  test("charts render in ascending count order", () => {
    render(
      <StatisticsDisplay
        data={data}
        showOutliers={true}
        setSelectedEntry={setSelectedEntry}
        selectedEntry={null}
      />
    );

    const contCharts = screen.getAllByTestId("continuous-chart");
    expect(contCharts[0]).toHaveAttribute("data-feature", "B");
    expect(contCharts[1]).toHaveAttribute("data-feature", "A");

    const catCharts = screen.getAllByTestId("categorical-chart");
    expect(catCharts).toHaveLength(1);
    expect(catCharts[0]).toHaveAttribute("data-feature", "C");

    const dateCharts = screen.getAllByTestId("date-chart");
    expect(dateCharts).toHaveLength(1);
    expect(dateCharts[0]).toHaveAttribute("data-feature", "D");
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

    const firstCont = screen.getAllByTestId("continuous-chart")[0];
    fireEvent.click(firstCont);
    expect(setSelectedEntry).toHaveBeenCalledWith({
      type: "continuous",
      featureName: "B",
    });
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

    const cont = screen.getAllByTestId("continuous-chart")[0];
    fireEvent.doubleClick(cont);
    expect(screen.getByTestId("chart-preview")).toBeInTheDocument();
    expect(
      screen.getByTestId("preview-content").querySelector('[data-testid="continuous-chart"]')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("close-preview"));
    expect(screen.queryByTestId("chart-preview")).toBeNull();
  });
});
