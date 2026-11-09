import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import ColumnMappingsDialog from "./columnMappingsDialog";
import { sourceKey } from "../CombinedStatistics/combinedStatistics";

const sources = [
  { nodeId: 1, nodeName: "Alpha", fileName: "patients.csv", continuousFeatures: [{ featureName: "Age" }], categoricalFeatures: [{ featureName: "Sex" }], dateFeatures: [{ featureName: "VisitDate" }] },
  { nodeId: 2, nodeName: "Beta", fileName: "patients.csv", continuousFeatures: [{ featureName: "Age" }, { featureName: "PatientAge" }], categoricalFeatures: [{ featureName: "Sex" }], dateFeatures: [{ featureName: "VisitDate" }] },
];
const mappings = [{ id: "age", label: "Age", type: "continuous", members: sources.map(source => ({ nodeId: source.nodeId, fileName: source.fileName, column: "Age" })) }];

it('adds and focuses a combination from the clickable empty state', () => {
  render(<ColumnMappingsDialog open mappings={[]} sources={sources} onClose={vi.fn()} onApply={vi.fn()} />);
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name:'Add a combination to link features from different files.'}));
  expect(screen.getByLabelText('Combined feature name 1')).toHaveFocus();
  expect(screen.getByRole('table', {name:'Feature combinations across files'})).toBeInTheDocument();
  expect(screen.queryByText(/Type filters the source features/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name:'Remove combination 1'}));
  expect(screen.getByRole('button', {name:'Add a combination to link features from different files.'})).toBeInTheDocument();
});

it("marks filtered sources and selections without modifying their raw column values", () => {
  render(<ColumnMappingsDialog open mappings={mappings} sources={sources} onClose={vi.fn()} onApply={vi.fn()} appliedFilters={new Map([[sourceKey(sources[0]), 'cluster (= 1)']])} />);
  expect(screen.getAllByRole('img', { name: /Filtered records:.*cluster/ }).length).toBeGreaterThan(1);
  expect(screen.getByRole('combobox', { name: 'Feature from Alpha / patients.csv in combination 1' })).toHaveValue('Age');
  expect(screen.getByRole('combobox', { name: 'Feature from Beta / patients.csv in combination 1' })).toHaveValue('Age');
});

it("edits the actual source column in a mapping and applies it", async () => {
  const apply = vi.fn().mockResolvedValue(undefined), close = vi.fn();
  render(<ColumnMappingsDialog open mappings={mappings} sources={sources} onClose={close} onApply={apply} />);
  const beta = screen.getByRole("combobox", { name: "Feature from Beta / patients.csv in combination 1" });
  fireEvent.change(beta, { target: { value: "PatientAge" } });
  fireEvent.click(await screen.findByRole("option", { name: /PatientAge/ }));
  fireEvent.click(screen.getByRole("button", { name: "Apply combinations" }));
  await waitFor(() => expect(apply).toHaveBeenCalled());
  expect(apply.mock.calls[0][0][0].members.find(member => member.nodeId === 2).column).toBe("PatientAge");
  expect(close).toHaveBeenCalled();
  expect(mappings[0].members[1].column).toBe("Age");
});

it("keeps edits local on cancel and rejects incomplete mappings", async () => {
  const apply = vi.fn(), close = vi.fn();
  render(<ColumnMappingsDialog open mappings={mappings} sources={sources} onClose={close} onApply={apply} />);
  fireEvent.change(screen.getByLabelText("Combined feature name 1"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply combinations" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Give each combined feature a name");
  expect(apply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(close).toHaveBeenCalled();
  expect(mappings[0].label).toBe("Age");
});

it("keeps the editor open when refreshing mapped statistics fails", async () => {
  const close = vi.fn();
  render(<ColumnMappingsDialog open mappings={mappings} sources={sources} onClose={close} onApply={vi.fn().mockRejectedValue(new Error("Beta is unavailable"))} />);
  fireEvent.click(screen.getByRole("button", { name: "Apply combinations" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Beta is unavailable");
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Apply combinations" })).toBeEnabled();
});

it("lets a user select a type and then choose compatible source features", async () => {
  const apply = vi.fn().mockResolvedValue(undefined);
  render(<ColumnMappingsDialog open mappings={mappings} sources={sources} onClose={vi.fn()} onApply={apply} />);
  expect(screen.getByRole("dialog", { name: "Combine feature statistics" })).toBeInTheDocument();
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Feature type for combination 1" }));
  fireEvent.click(screen.getByRole("option", { name: "Categorical" }));
  const alpha = screen.getByRole("combobox", { name: "Feature from Alpha / patients.csv in combination 1" });
  const beta = screen.getByRole("combobox", { name: "Feature from Beta / patients.csv in combination 1" });
  expect(alpha).toHaveValue("");
  expect(beta).toHaveValue("");
  fireEvent.change(screen.getByLabelText("Combined feature name 1"), { target: { value: "Sex" } });
  fireEvent.change(alpha, { target: { value: "Sex" } });
  fireEvent.click(await screen.findByRole("option", { name: /Sex/ }));
  fireEvent.change(beta, { target: { value: "Sex" } });
  fireEvent.click(await screen.findByRole("option", { name: /Sex/ }));
  fireEvent.click(screen.getByRole("button", { name: "Apply combinations" }));
  await waitFor(() => expect(apply).toHaveBeenCalled());
  expect(apply.mock.calls[0][0][0]).toMatchObject({ label: "Sex", type: "categorical", members: sources.map(source => ({ nodeId: source.nodeId, fileName: source.fileName, column: "Sex" })) });
});
