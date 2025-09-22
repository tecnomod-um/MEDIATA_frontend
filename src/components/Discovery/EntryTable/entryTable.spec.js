import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
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

  it("renders exactly 2 data rows + 6 filler rows (8 total)", () => {
    const onRowSelect = jest.fn();
    render(
      <EntryTable
        filteredLists={filteredLists}
        minCellWidth={50}
        onRowSelect={onRowSelect}
        selectedEntry={selectedEntry}
        type={type}
      />
    );

    const table = screen.getByRole("table");
    const [, tbody] = within(table).getAllByRole("rowgroup");
    const bodyRows = within(tbody).getAllByRole("row");
    expect(bodyRows).toHaveLength(8);

    let cells = within(bodyRows[0]).getAllByRole("cell");
    expect(cells[0]).toHaveTextContent("foo");
    expect(cells[1]).toHaveTextContent("10");

    cells = within(bodyRows[1]).getAllByRole("cell");
    expect(cells[0]).toHaveTextContent("bar");
    expect(cells[1]).toHaveTextContent("20");

    bodyRows.slice(2).forEach((row) => {
      expect(row).toHaveClass("resTr", "fillerRow");
      const rowCells = within(row).getAllByRole("cell");
      rowCells.forEach((cell) => {
        const raw = cell.textContent ?? "";
        const normalized = raw.replace(/\u00a0/g, "").trim();
        expect(normalized).toBe("");
      });
    });
  });

  it("calls onRowSelect with correct payload when clicking a data row", () => {
    const onRowSelect = jest.fn();
    render(
      <EntryTable
        filteredLists={filteredLists}
        minCellWidth={50}
        onRowSelect={onRowSelect}
        selectedEntry={selectedEntry}
        type={type}
      />
    );

    const table = screen.getByRole("table");
    const [, tbody] = within(table).getAllByRole("rowgroup");
    const bodyRows = within(tbody).getAllByRole("row");
    fireEvent.click(bodyRows[1]);

    expect(onRowSelect).toHaveBeenCalledWith({ featureName: "bar", type: "myType" });
  });

  it("marks only the selected row with selectedRow class", () => {
    const onRowSelect = jest.fn();
    render(
      <EntryTable
        filteredLists={filteredLists}
        minCellWidth={50}
        onRowSelect={onRowSelect}
        selectedEntry={selectedEntry}
        type={type}
      />
    );

    const table = screen.getByRole("table");
    const [, tbody] = within(table).getAllByRole("rowgroup");
    const bodyRows = within(tbody).getAllByRole("row");

    expect(bodyRows[0]).toHaveClass("selectedRow");
    expect(bodyRows[1]).not.toHaveClass("selectedRow");
  });

  it("renders one resize handle per column header", () => {
    const onRowSelect = jest.fn();
    render(
      <EntryTable
        filteredLists={filteredLists}
        minCellWidth={50}
        onRowSelect={onRowSelect}
        selectedEntry={selectedEntry}
        type={type}
      />
    );

    const table = screen.getByRole("table");
    const [thead] = within(table).getAllByRole("rowgroup");
    const headers = within(thead).getAllByRole("columnheader");

    headers.forEach((th) => {
      const handle = within(th).getByRole("separator", { name: /resize column/i });
      expect(handle).toHaveClass("resizeHandle");
      expect(handle).toHaveClass("idle");
      expect(handle).toHaveAttribute("aria-orientation", "vertical");
    });
    expect(headers).toHaveLength(2);
  });
});
