import React from "react";
import { render, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import EntryTable from "./entryTable";

jest.mock("./entryTable.module.css", () => ({
  resTable: "resTable",
  resThead: "resThead",
  resTbody: "resTbody",
  resTr: "resTr",
  resTh: "resTh",
  resTd: "resTd",
  resSpan: "resSpan",
  resizeHandle: "resizeHandle",
  active: "active",
  idle: "idle",
  selectedRow: "selectedRow",
  selectedEntry: "selectedEntry",
  fillerRow: "fillerRow",
}));

describe("<EntryTable />", () => {
  const filteredLists = {
    Name: ["foo", "bar"],
    Age: ["10", "20"],
  };
  const type = "myType";
  const selectedEntry = { featureName: "foo", type };
  let onRowSelect, container;

  beforeEach(() => {
    onRowSelect = jest.fn();
    ({ container } = render(
      <EntryTable
        filteredLists={filteredLists}
        minCellWidth={50}
        onRowSelect={onRowSelect}
        selectedEntry={selectedEntry}
        type={type}
      />
    ));
  });

  it("renders exactly 2 data rows + 6 filler rows (8 total)", () => {
    const rows = Array.from(container.querySelectorAll("tbody tr"));
    expect(rows).toHaveLength(8);
    expect(rows[0].textContent).toMatch(/foo.*10/);
    expect(rows[1].textContent).toMatch(/bar.*20/);

    rows.slice(2).forEach((row) => {
      expect(row).toHaveClass("resTr", "fillerRow");
      row.querySelectorAll("td").forEach((td) => {
        expect(td.textContent).toBe("\u00a0");
      });
    });
  });

  it("calls onRowSelect with correct payload when clicking a data row", () => {
    const rows = Array.from(container.querySelectorAll("tbody tr"));
    fireEvent.click(rows[1]);
    expect(onRowSelect).toHaveBeenCalledWith({
      featureName: "bar",
      type: "myType",
    });
  });

  it("marks only the selected row with selectedRow class", () => {
    const rows = Array.from(container.querySelectorAll("tbody tr"));
    expect(rows[0]).toHaveClass("selectedRow");
    expect(rows[1]).not.toHaveClass("selectedRow");
  });

  it("renders one resizeHandle per column header", () => {
    const handles = Array.from(container.querySelectorAll("thead th .resizeHandle"));
    expect(handles).toHaveLength(2);
    handles.forEach((h) => {
      expect(h).toHaveClass("resizeHandle", "idle");
    });
  });
});
