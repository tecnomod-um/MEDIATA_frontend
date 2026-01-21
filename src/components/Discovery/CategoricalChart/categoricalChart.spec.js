import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import CategoricalChart from "./categoricalChart";

jest.mock("react-chartjs-2", () => {
  const ReactInside = require("react");
  return {
    Bar: ReactInside.forwardRef(({ data, options }, ref) => {
      ReactInside.useImperativeHandle(
        ref,
        () => ({
          update: jest.fn(),
          resize: jest.fn(),
        }),
        []
      );
      return (
        <div
          data-testid="mock-bar"
          data-data={JSON.stringify(data)}
          data-options={JSON.stringify(options)}
        />
      );
    }),
  };
});

jest.mock("chroma-js", () => () => ({
  darken: () => ({ hex: () => "#000000" }),
}));

jest.mock("../../../util/colors", () => ({
  generateColorList: () => ["#AAA", "#BBB"],
}));

const BASE_FEATURE = {
  featureName: "FeatureX",
  categoryCounts: { One: 10, Two: 20, MissingValues: 0 },
  missingValuesCount: 0,
};

describe("<CategoricalChart />", () => {
  it("renders without crashing and outputs a <Bar>", () => {
    render(<CategoricalChart feature={BASE_FEATURE} />);
    expect(screen.getByTestId("mock-bar")).toBeInTheDocument();
  });

  it("applies CSS classes and fires click events", () => {
    const onClick = jest.fn();
    const onDbl = jest.fn();

    render(
      <CategoricalChart
        feature={BASE_FEATURE}
        isSelected
        inOverview
        onClick={onClick}
        onDoubleClick={onDbl}
      />
    );

    const container = screen.getByRole("button", {
      name: /Chart for FeatureX/i,
    });
    fireEvent.click(container);
    fireEvent.doubleClick(container);

    expect(onClick).toHaveBeenCalled();
    expect(onDbl).toHaveBeenCalled();
  });

  it("passes correct data when missingValuesCount = 0 (sorted by count desc)", () => {
    render(<CategoricalChart feature={BASE_FEATURE} />);
    const bar = screen.getByTestId("mock-bar");
    const data = JSON.parse(bar.getAttribute("data-data"));
    expect(data.labels).toEqual(["Two", "One"]);
    expect(data.datasets[0].data).toEqual([20, 10]);
    expect(data.datasets[0].backgroundColor).toEqual(["#BBB", "#AAA"]);
  });

  it('adds "No data" slice when missingValuesCount > 0 (sorted by count desc)', () => {
    const feat = { ...BASE_FEATURE, missingValuesCount: 5 };
    render(<CategoricalChart feature={feat} />);

    const data = JSON.parse(
      screen.getByTestId("mock-bar").getAttribute("data-data")
    );

    expect(data.labels).toEqual(["Two", "One", "No data"]);
    expect(data.datasets[0].data).toEqual([20, 10, 5]);
    expect(data.datasets[0].backgroundColor.slice(-1)[0]).toBe("#D3D3D3");
  });

  it("resizes and updates chart via effects without error", () => {
    const { rerender } = render(<CategoricalChart feature={BASE_FEATURE} />);

    act(() => window.dispatchEvent(new Event("resize")));

    rerender(
      <CategoricalChart
        feature={{
          ...BASE_FEATURE,
          categoryCounts: { One: 11, Two: 20, MissingValues: 0 },
        }}
      />
    );
  });

  it('adds "Other" category when there are many categories in overview mode', () => {
    const featWithMany = {
      featureName: "ManyCategories",
      categoryCounts: {
        A: 100, B: 90, C: 80, D: 70, E: 60,
        F: 50, G: 40, H: 30, I: 20, J: 10,
        K: 5, L: 4, M: 3, N: 2, O: 1
      },
      missingValuesCount: 0,
    };
    
    // Must use inOverview prop to trigger grouping (TOP_N_OVERVIEW = 8)
    render(<CategoricalChart feature={featWithMany} inOverview={true} />);
    const data = JSON.parse(
      screen.getByTestId("mock-bar").getAttribute("data-data")
    );
    
    // Should group categories beyond top 8 into "Other"
    expect(data.labels).toContain("Other");
  });

  it("handles keyboard navigation", () => {
    const onClick = jest.fn();
    render(<CategoricalChart feature={BASE_FEATURE} onClick={onClick} />);
    
    const container = screen.getByRole("button");
    fireEvent.keyDown(container, { key: "Enter" });
    
    expect(onClick).toHaveBeenCalled();
  });

  it("handles space key navigation", () => {
    const onClick = jest.fn();
    render(<CategoricalChart feature={BASE_FEATURE} onClick={onClick} />);
    
    const container = screen.getByRole("button");
    fireEvent.keyDown(container, { key: " " });
    
    expect(onClick).toHaveBeenCalled();
  });

  it("configures tooltip footer when categories are grouped", () => {
    const featWithMany = {
      featureName: "ManyCategories",
      categoryCounts: {
        A: 100, B: 90, C: 80, D: 70, E: 60,
        F: 50, G: 40, H: 30, I: 20, J: 10,
        K: 5, L: 4, M: 3, N: 2, O: 1
      },
      missingValuesCount: 0,
    };
    
    render(<CategoricalChart feature={featWithMany} inOverview={true} />);
    const bar = screen.getByTestId("mock-bar");
    const options = JSON.parse(bar.getAttribute("data-options"));
    
    // Should have tooltip configured
    expect(options.plugins).toBeDefined();
    expect(options.plugins.tooltip).toBeDefined();
    
    // Title should indicate grouped categories  
    const title = options.plugins.title.text;
    expect(title).toContain("grouped");
  });
});
