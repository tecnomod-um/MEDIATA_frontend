import React from "react";
import {act, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, expect, it, vi} from "vitest";
import useFeatureSelectionGesture from "./useFeatureSelectionGesture";

function Chart({onSelect, onPreview}) {
  return <div role="button" aria-label="Histogram" {...useFeatureSelectionGesture(onSelect, onPreview)} />;
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("adds on a long press once and consumes the release click and accidental preview", () => {
  const onSelect=vi.fn(), onPreview=vi.fn();
  render(<Chart onSelect={onSelect} onPreview={onPreview} />);
  const chart=screen.getByRole("button");
  fireEvent.pointerDown(chart,{isPrimary:true,button:0,clientX:10,clientY:10});
  act(()=>vi.advanceTimersByTime(400));
  expect(onSelect).toHaveBeenCalledExactlyOnceWith({additive:true});
  fireEvent.pointerUp(chart);
  fireEvent.click(chart);
  fireEvent.doubleClick(chart);
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onPreview).not.toHaveBeenCalled();
});

it("keeps normal clicks, modifier clicks and double-click previews", () => {
  const onSelect=vi.fn(), onPreview=vi.fn();
  render(<Chart onSelect={onSelect} onPreview={onPreview} />);
  const chart=screen.getByRole("button");
  fireEvent.pointerDown(chart,{isPrimary:true,button:0});
  fireEvent.pointerUp(chart);
  fireEvent.click(chart,{ctrlKey:true});
  act(()=>vi.advanceTimersByTime(500));
  expect(onSelect).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ctrlKey:true}));
  fireEvent.doubleClick(chart);
  expect(onPreview).toHaveBeenCalledTimes(1);
});

it.each(["pointerMove","pointerCancel","pointerLeave"])("cancels a hold on %s and ignores its release click", event => {
  const onSelect=vi.fn();
  render(<Chart onSelect={onSelect} />);
  const chart=screen.getByRole("button");
  fireEvent.pointerDown(chart,{isPrimary:true,button:0,clientX:0,clientY:0});
  fireEvent[event](chart,{clientX:30,clientY:30});
  act(()=>vi.advanceTimersByTime(500));
  fireEvent.pointerUp(chart);
  fireEvent.click(chart);
  expect(onSelect).not.toHaveBeenCalled();
});

it("clears pending holds when the chart unmounts", () => {
  const onSelect=vi.fn();
  const view=render(<Chart onSelect={onSelect} />);
  fireEvent.pointerDown(screen.getByRole("button"),{isPrimary:true,button:0});
  view.unmount();
  act(()=>vi.advanceTimersByTime(500));
  expect(onSelect).not.toHaveBeenCalled();
});
