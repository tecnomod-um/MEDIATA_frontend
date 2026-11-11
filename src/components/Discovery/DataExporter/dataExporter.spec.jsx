import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import DataExporter from "./dataExporter";
import { reportFixture } from "./reportTestFixtures";

let workers, download, createUrl;
beforeEach(() => {
  workers = [];
  vi.stubGlobal("Worker", class {
    constructor() { this.postMessage = vi.fn(); this.terminate = vi.fn(); workers.push(this); }
  });
  createUrl = vi.fn(() => "blob:statistics");
  vi.stubGlobal("URL", class extends URL { static createObjectURL = createUrl; static revokeObjectURL = vi.fn(); });
  download = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function setup(props = {}) {
  const fixture = reportFixture();
  const onRelationshipsChange = vi.fn();
  const view = render(<DataExporter statisticsExport={fixture} onRelationshipsChange={onRelationshipsChange} {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Export statistics", exact: true }));
  return { ...fixture, ...view, onRelationshipsChange };
}

it("opens the existing export control with selected features preselected, without downloading until requested", () => {
  const fixture = reportFixture();
  const { onRelationshipsChange } = setup({ selectedEntries: [fixture.sourceData.continuousFeatures[0]] });
  expect(screen.getByRole("dialog", { name: "Export statistics" })).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: /Selected features/ })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: /Include per-dataset breakdown/ })).toBeChecked();
  expect(screen.getByRole("combobox", { name: "Export format" })).toHaveValue("xlsx");
  expect(onRelationshipsChange).toHaveBeenCalledWith(false);
  expect(download).not.toHaveBeenCalled();
});

it("exports all visible features by default when nothing is selected, with one asynchronous download", async () => {
  const { onRelationshipsChange } = setup();
  expect(screen.getByRole("radio", { name: /All visible features/ })).toBeChecked();
  expect(screen.getByRole("radio", { name: /Selected features/ })).toBeDisabled();
  fireEvent.change(screen.getByRole("combobox", { name: "Export format" }), { target: { value: "csv" } });
  fireEvent.click(screen.getByRole("button", { name: "Download", exact: true }));
  expect(workers).toHaveLength(1);
  expect(workers[0].postMessage.mock.calls[0][0]).toMatchObject({ format: "csv", selectedOnly: false, includeBreakdown: true });
  const downloadButton = screen.getByRole("button", { name: "Download", exact: true });
  expect(downloadButton).toHaveAttribute("aria-busy", "true");
  expect(downloadButton).toContainElement(screen.getByRole("progressbar", { name: "Preparing statistics…" }));
  expect(screen.getByRole("combobox", { name: "Export format" })).toBeDisabled();
  act(() => workers[0].onmessage({ data: { status: "Creating CSV tables…" } }));
  expect(downloadButton).toContainElement(screen.getByRole("progressbar", { name: "Creating CSV tables…" }));
  act(() => workers[0].onmessage({ data: { blob: new Blob(["report"]) } }));
  expect(download).toHaveBeenCalledTimes(1);
  expect(createUrl).toHaveBeenCalledTimes(1);
  expect(workers[0].terminate).toHaveBeenCalled();
  expect(onRelationshipsChange).toHaveBeenLastCalledWith(false);
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

it("waits for requested relationship calculations and lets summaries be exported independently", () => {
  setup({ relationshipExport: { pending: true, data: {} } });
  fireEvent.click(screen.getByRole("checkbox", { name: /Include relationships/ }));
  const downloadButton = screen.getByRole("button", { name: "Download", exact: true });
  expect(downloadButton).toContainElement(screen.getByRole("progressbar", { name: "Calculating relationships…" }));
  expect(downloadButton).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: /Include relationships/ }));
  expect(downloadButton).toBeEnabled();
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
});

it("defaults to relationships in the aggregate view and shows failures without silently omitting them", () => {
  setup({ relationshipExport: { active: true, error: "Node summaries are unavailable" } });
  expect(screen.getByRole("checkbox", { name: /Include relationships/ })).toBeChecked();
  expect(screen.getByRole("alert")).toHaveTextContent("Node summaries are unavailable");
  expect(screen.getByRole("button", { name: "Download", exact: true })).toBeDisabled();
});

it("cancels worker generation and ignores a stale completion rather than downloading a cancelled report", async () => {
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Download", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel export", exact: true }));
  act(() => workers[0].onmessage({ data: { blob: new Blob(["cancelled"]) } }));
  expect(download).not.toHaveBeenCalled();
  expect(workers[0].terminate).toHaveBeenCalled();
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

it("keeps the dialog open with retry available if report generation fails", () => {
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Download", exact: true }));
  act(() => workers[0].onmessage({ data: { error: "Workbook generation failed" } }));
  expect(screen.getByRole("alert")).toHaveTextContent("Workbook generation failed");
  expect(screen.getByRole("button", { name: "Download", exact: true })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Download", exact: true }));
  expect(workers).toHaveLength(2);
});

it("cleans up an in-progress worker when the exporter unmounts", () => {
  const view = setup();
  fireEvent.click(screen.getByRole("button", { name: "Download", exact: true }));
  view.unmount();
  expect(workers[0].terminate).toHaveBeenCalled();
});

it("recovers from an unreadable worker response without leaving the export busy", () => {
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Download", exact: true }));
  act(() => workers[0].onmessageerror());
  expect(screen.getByRole("alert")).toHaveTextContent("The report could not be created");
  expect(screen.getByRole("button", { name: "Download", exact: true })).toBeEnabled();
  expect(workers[0].terminate).toHaveBeenCalled();
});

it("removes the temporary download link and allows retry when the browser rejects a download", () => {
  setup();
  download.mockImplementationOnce(() => { throw new Error("Download rejected"); });
  fireEvent.click(screen.getByRole("button", { name: "Download", exact: true }));
  act(() => workers[0].onmessage({ data: { blob: new Blob(["report"]) } }));
  expect(screen.getByRole("alert")).toHaveTextContent("could not be downloaded");
  expect(document.querySelector("a[download]")).toBeNull();
  expect(screen.getByRole("button", { name: "Download", exact: true })).toBeEnabled();
});
