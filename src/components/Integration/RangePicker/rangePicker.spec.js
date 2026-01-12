import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import RangePicker from "./rangePicker";

jest.mock("rc-slider", () => ({
  __esModule: true,
  default: ({ onChange, onChangeComplete }) => (
    <div data-testid="slider">
      <button
        onClick={() => {
          onChange([2, 4]);
          if (onChangeComplete) onChangeComplete([2, 4]);
        }}
      >
        Simulate Slide
      </button>
    </div>
  ),
}));

describe("<RangePicker />", () => {
  it('displays "All ranges have been mapped." when no available ranges', () => {
    render(
      <RangePicker
        min={0}
        max={5}
        type="integer"
        onRangeChange={jest.fn()}
        unavailableRanges={[[0, 5]]}
      />
    );

    expect(
      screen.getByText(/All ranges have been mapped\./i)
    ).toBeInTheDocument();
    expect(screen.queryByText("Set")).toBeNull();
  });

  it("initializes to first available range, bumps overlapping, and calls onRangeChange on Set (integer)", () => {
    const onRangeChange = jest.fn();

    render(
      <RangePicker
        min={0}
        max={10}
        type="integer"
        onRangeChange={onRangeChange}
        unavailableRanges={[[1, 2]]}
      />
    );

    expect(
      screen.getByText(/Selected range:\s*0\s*–\s*0/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Simulate Slide"));

    expect(
      screen.getByText(/Selected range:\s*3\s*–\s*4/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Set"));
    expect(onRangeChange).toHaveBeenCalledWith({ minValue: 3, maxValue: 4 });
  });

  it("initializes date picker and calls onRangeChange on Set (date)", () => {
    const onRangeChange = jest.fn();
    const oneDay = 24 * 60 * 60 * 1000;
    const min = Date.parse("2020-01-01");
    const max = Date.parse("2020-01-10");

    render(
      <RangePicker
        min={min}
        max={max}
        type="date"
        onRangeChange={onRangeChange}
        unavailableRanges={[[min + oneDay, min + 2 * oneDay]]}
      />
    );

    const iso = new Date(min).toISOString().split("T")[0];

    expect(
      screen.getByText(new RegExp(`Selected range:\\s*${iso}\\s*–\\s*${iso}`, "i"))
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Set"));

    expect(onRangeChange).toHaveBeenCalledWith({
      minValue: new Date(min),
      maxValue: new Date(min),
    });
  });
});
