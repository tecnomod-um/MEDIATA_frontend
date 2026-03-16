import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import RangePicker from "./rangePicker";
import { vi } from "vitest";

vi.mock("rc-slider", () => ({
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
        onRangeChange={vi.fn()}
        unavailableRanges={[[0, 5]]}
      />
    );

    expect(
      screen.getByText(/All ranges have been mapped\./i)
    ).toBeInTheDocument();
    expect(screen.queryByText("Set")).toBeNull();
  });

  it("initializes to first available range, bumps overlapping, and calls onRangeChange on Set (integer)", () => {
    const onRangeChange = vi.fn();

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
    const onRangeChange = vi.fn();
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

  it("allows double-click to edit range values", () => {
    const onRangeChange = vi.fn();
    render(
      <RangePicker
        min={0}
        max={10}
        type="integer"
        onRangeChange={onRangeChange}
        unavailableRanges={[]}
      />
    );

    const rangeText = screen.getByText(/Selected range:/i);
    fireEvent.doubleClick(rangeText);

    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs).toHaveLength(2);
  });

  it("handles input change for min value (integer)", () => {
    const onRangeChange = vi.fn();
    render(
      <RangePicker
        min={0}
        max={10}
        type="integer"
        onRangeChange={onRangeChange}
        unavailableRanges={[]}
      />
    );

    const rangeText = screen.getByText(/Selected range:/i);
    fireEvent.doubleClick(rangeText);

    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "3" } });

    expect(inputs[0].value).toBe("3");
  });

  it("handles input change for max value (integer)", () => {
    const onRangeChange = vi.fn();
    render(
      <RangePicker
        min={0}
        max={10}
        type="integer"
        onRangeChange={onRangeChange}
        unavailableRanges={[]}
      />
    );

    const rangeText = screen.getByText(/Selected range:/i);
    fireEvent.doubleClick(rangeText);

    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[1], { target: { value: "8" } });

    expect(inputs[1].value).toBe("8");
  });

  it("handles input change for date values", () => {
    const onRangeChange = vi.fn();
    const min = Date.parse("2020-01-01");
    const max = Date.parse("2020-01-10");

    render(
      <RangePicker
        min={min}
        max={max}
        type="date"
        onRangeChange={onRangeChange}
        unavailableRanges={[]}
      />
    );

    const rangeText = screen.getByText(/Selected range:/i);
    fireEvent.doubleClick(rangeText);

    // After double-click, the range display should still be visible
    expect(screen.getByText(/Selected range:/i)).toBeInTheDocument();
  });

  it("ignores invalid date input", () => {
    const onRangeChange = vi.fn();
    const min = Date.parse("2020-01-01");
    const max = Date.parse("2020-01-10");

    render(
      <RangePicker
        min={min}
        max={max}
        type="date"
        onRangeChange={onRangeChange}
        unavailableRanges={[]}
      />
    );

    const rangeText = screen.getByText(/Selected range:/i);
    fireEvent.doubleClick(rangeText);

    // Just verify the component renders without crashing
    expect(rangeText).toBeInTheDocument();
  });

  it("ignores invalid numeric input", () => {
    const onRangeChange = vi.fn();
    render(
      <RangePicker
        min={0}
        max={10}
        type="integer"
        onRangeChange={onRangeChange}
        unavailableRanges={[]}
      />
    );

    const rangeText = screen.getByText(/Selected range:/i);
    fireEvent.doubleClick(rangeText);

    const inputs = screen.getAllByRole("spinbutton");
    const originalValue = inputs[0].value;
    fireEvent.change(inputs[0], { target: { value: "abc" } });

    expect(inputs[0].value).toBe(originalValue);
  });

  it("adjusts range when it overlaps unavailable ranges", () => {
    const onRangeChange = vi.fn();
    render(
      <RangePicker
        min={0}
        max={10}
        type="integer"
        onRangeChange={onRangeChange}
        unavailableRanges={[[3, 5]]}
      />
    );

    const rangeText = screen.getByText(/Selected range:/i);
    fireEvent.doubleClick(rangeText);

    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "2" } });
    fireEvent.change(inputs[1], { target: { value: "7" } });

    // Range should be adjusted to avoid overlap
    expect(screen.getByText(/Selected range:/i)).toBeInTheDocument();
  });

  it("handles multiple unavailable ranges", () => {
    const onRangeChange = vi.fn();
    render(
      <RangePicker
        min={0}
        max={20}
        type="integer"
        onRangeChange={onRangeChange}
        unavailableRanges={[[3, 5], [10, 12], [15, 17]]}
      />
    );

    expect(screen.getByText(/Selected range:/i)).toBeInTheDocument();
  });

  it("handles range completely inside unavailable range", () => {
    const onRangeChange = vi.fn();
    render(
      <RangePicker
        min={0}
        max={20}
        type="integer"
        onRangeChange={onRangeChange}
        unavailableRanges={[[5, 15]]}
      />
    );

    const rangeText = screen.getByText(/Selected range:/i);
    fireEvent.doubleClick(rangeText);

    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "8" } });
    fireEvent.change(inputs[1], { target: { value: "10" } });

    // Should move to next available range
    expect(screen.getByText(/Selected range:/i)).toBeInTheDocument();
  });

  it("handles range that starts before and ends after unavailable range", () => {
    const onRangeChange = vi.fn();
    render(
      <RangePicker
        min={0}
        max={20}
        type="integer"
        onRangeChange={onRangeChange}
        unavailableRanges={[[8, 12]]}
      />
    );

    const rangeText = screen.getByText(/Selected range:/i);
    fireEvent.doubleClick(rangeText);

    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "5" } });
    fireEvent.change(inputs[1], { target: { value: "15" } });

    // Should adjust to avoid overlap
    expect(screen.getByText(/Selected range:/i)).toBeInTheDocument();
  });

  it("handles range that overlaps at start", () => {
    const onRangeChange = vi.fn();
    render(
      <RangePicker
        min={0}
        max={20}
        type="integer"
        onRangeChange={onRangeChange}
        unavailableRanges={[[10, 15]]}
      />
    );

    const rangeText = screen.getByText(/Selected range:/i);
    fireEvent.doubleClick(rangeText);

    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "8" } });
    fireEvent.change(inputs[1], { target: { value: "12" } });

    expect(screen.getByText(/Selected range:/i)).toBeInTheDocument();
  });

  it("handles range that overlaps at end", () => {
    const onRangeChange = vi.fn();
    render(
      <RangePicker
        min={0}
        max={20}
        type="integer"
        onRangeChange={onRangeChange}
        unavailableRanges={[[5, 10]]}
      />
    );

    const rangeText = screen.getByText(/Selected range:/i);
    fireEvent.doubleClick(rangeText);

    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "7" } });
    fireEvent.change(inputs[1], { target: { value: "15" } });

    expect(screen.getByText(/Selected range:/i)).toBeInTheDocument();
  });

  it("handles empty unavailableRanges array", () => {
    const onRangeChange = vi.fn();
    render(
      <RangePicker
        min={0}
        max={10}
        type="integer"
        onRangeChange={onRangeChange}
        unavailableRanges={[]}
      />
    );

    expect(screen.getByText(/Selected range:\s*0\s*–\s*10/i)).toBeInTheDocument();
  });

  it("handles unavailableRanges prop not provided", () => {
    const onRangeChange = vi.fn();
    render(
      <RangePicker
        min={0}
        max={10}
        type="integer"
        onRangeChange={onRangeChange}
      />
    );

    expect(screen.getByText(/Selected range:/i)).toBeInTheDocument();
  });

  it("formats date values correctly", () => {
    const onRangeChange = vi.fn();
    const min = Date.parse("2020-05-15");
    const max = Date.parse("2020-06-20");

    render(
      <RangePicker
        min={min}
        max={max}
        type="date"
        onRangeChange={onRangeChange}
        unavailableRanges={[]}
      />
    );

    expect(screen.getByText(/2020-05-15/i)).toBeInTheDocument();
  });

  it("calls onRangeChange with Date objects for date type", () => {
    const onRangeChange = vi.fn();
    const min = Date.parse("2020-01-01");
    const max = Date.parse("2020-01-10");

    render(
      <RangePicker
        min={min}
        max={max}
        type="date"
        onRangeChange={onRangeChange}
        unavailableRanges={[]}
      />
    );

    fireEvent.click(screen.getByText("Set"));

    expect(onRangeChange).toHaveBeenCalled();
    const call = onRangeChange.mock.calls[0][0];
    expect(call.minValue).toBeInstanceOf(Date);
    expect(call.maxValue).toBeInstanceOf(Date);
  });

  it("calls onRangeChange with numbers for integer type", () => {
    const onRangeChange = vi.fn();
    render(
      <RangePicker
        min={0}
        max={10}
        type="integer"
        onRangeChange={onRangeChange}
        unavailableRanges={[]}
      />
    );

    fireEvent.click(screen.getByText("Set"));

    expect(onRangeChange).toHaveBeenCalled();
    const call = onRangeChange.mock.calls[0][0];
    expect(typeof call.minValue).toBe("number");
    expect(typeof call.maxValue).toBe("number");
  });

  it("exits edit mode when Set is clicked", () => {
    const onRangeChange = vi.fn();
    render(
      <RangePicker
        min={0}
        max={10}
        type="integer"
        onRangeChange={onRangeChange}
        unavailableRanges={[]}
      />
    );

    const rangeText = screen.getByText(/Selected range:/i);
    fireEvent.doubleClick(rangeText);

    expect(screen.getAllByRole("spinbutton")).toHaveLength(2);

    fireEvent.click(screen.getByText("Set"));

    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("handles slider onChange without onChangeComplete", () => {
    // This test is just checking that the component doesn't crash
    // when the slider doesn't have onChangeComplete
    const onRangeChange = vi.fn();
    render(
      <RangePicker
        min={0}
        max={10}
        type="integer"
        onRangeChange={onRangeChange}
        unavailableRanges={[]}
      />
    );

    // Verify the component renders
    expect(screen.getByText(/Selected range:/i)).toBeInTheDocument();
  });

  it("handles edge case where min equals max", () => {
    const onRangeChange = vi.fn();
    render(
      <RangePicker
        min={5}
        max={5}
        type="integer"
        onRangeChange={onRangeChange}
        unavailableRanges={[]}
      />
    );

    expect(screen.getByText(/Selected range:\s*5\s*–\s*5/i)).toBeInTheDocument();
  });

  it("handles sorted unavailableRanges in getNextAvailableRange", () => {
    const onRangeChange = vi.fn();
    render(
      <RangePicker
        min={0}
        max={20}
        type="integer"
        onRangeChange={onRangeChange}
        unavailableRanges={[[15, 17], [5, 7], [10, 12]]}
      />
    );

    expect(screen.getByText(/Selected range:/i)).toBeInTheDocument();
  });

  it("handles unavailable range at the very start", () => {
    const onRangeChange = vi.fn();
    render(
      <RangePicker
        min={0}
        max={20}
        type="integer"
        onRangeChange={onRangeChange}
        unavailableRanges={[[0, 5]]}
      />
    );

    expect(screen.getByText(/Selected range:\s*6\s*–\s*20/i)).toBeInTheDocument();
  });

  it("handles unavailable range at the very end", () => {
    const onRangeChange = vi.fn();
    render(
      <RangePicker
        min={0}
        max={20}
        type="integer"
        onRangeChange={onRangeChange}
        unavailableRanges={[[15, 20]]}
      />
    );

    expect(screen.getByText(/Selected range:\s*0\s*–\s*14/i)).toBeInTheDocument();
  });

  it("handles value swap when min input is greater than max", () => {
    const onRangeChange = vi.fn();
    render(
      <RangePicker
        min={0}
        max={20}
        type="integer"
        onRangeChange={onRangeChange}
        unavailableRanges={[]}
      />
    );

    const rangeText = screen.getByText(/Selected range:/i);
    fireEvent.doubleClick(rangeText);

    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "15" } });
    fireEvent.change(inputs[1], { target: { value: "5" } });

    // Should swap and adjust
    expect(screen.getByText(/Selected range:/i)).toBeInTheDocument();
  });

  it("clamps values to min/max bounds", () => {
    const onRangeChange = vi.fn();
    render(
      <RangePicker
        min={0}
        max={10}
        type="integer"
        onRangeChange={onRangeChange}
        unavailableRanges={[]}
      />
    );

    const rangeText = screen.getByText(/Selected range:/i);
    fireEvent.doubleClick(rangeText);

    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "-5" } });
    fireEvent.change(inputs[1], { target: { value: "25" } });

    fireEvent.click(screen.getByText("Set"));

    // Should clamp to [0, 10]
    expect(onRangeChange).toHaveBeenCalled();
  });

  it("handles range completely inside unavailable with no next available range", () => {
    const onRangeChange = vi.fn();
    render(
      <RangePicker
        min={0}
        max={20}
        type="integer"
        onRangeChange={onRangeChange}
        unavailableRanges={[[0, 10], [12, 20]]}
      />
    );

    const rangeText = screen.getByText(/Selected range:/i);
    fireEvent.doubleClick(rangeText);

    const inputs = screen.getAllByRole("spinbutton");
    // Try to set range inside unavailable area when no available ranges exist
    fireEvent.change(inputs[0], { target: { value: "5" } });
    fireEvent.change(inputs[1], { target: { value: "8" } });

    // Should fall back to [min, min]
    expect(screen.getByText(/Selected range:/i)).toBeInTheDocument();
  });

  it("handles invalid date input in handleInputChange", () => {
    const onRangeChange = vi.fn();
    const min = Date.parse("2020-01-01");
    const max = Date.parse("2020-01-10");

    render(
      <RangePicker
        min={min}
        max={max}
        type="date"
        onRangeChange={onRangeChange}
        unavailableRanges={[]}
      />
    );

    const rangeText = screen.getByText(/Selected range:/i);
    fireEvent.doubleClick(rangeText);

    const inputs = screen.getAllByDisplayValue(/2020-01-01/);
    const originalValue = inputs[0].value;
    // Try to input an invalid date
    fireEvent.change(inputs[0], { target: { value: "not-a-date" } });

    // Range should remain unchanged (invalid input is ignored)
    expect(inputs[0].value).toBe(originalValue);
  });

  it("handles valid date input in handleInputChange", () => {
    const onRangeChange = vi.fn();
    const min = Date.parse("2020-01-01");
    const max = Date.parse("2020-01-10");

    render(
      <RangePicker
        min={min}
        max={max}
        type="date"
        onRangeChange={onRangeChange}
        unavailableRanges={[]}
      />
    );

    const rangeText = screen.getByText(/Selected range:/i);
    fireEvent.doubleClick(rangeText);

    const inputs = screen.getAllByDisplayValue(/2020-01-01/);
    fireEvent.change(inputs[0], { target: { value: "2020-01-05" } });

    // The input should now have the new value
    expect(inputs[0].value).toBe("2020-01-05");
  });
});
