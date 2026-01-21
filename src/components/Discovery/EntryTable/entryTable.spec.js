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

  it("handles keyboard navigation with Enter key", () => {
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
    
    fireEvent.keyDown(bodyRows[1], { key: 'Enter' });
    expect(onRowSelect).toHaveBeenCalledWith({ featureName: "bar", type: "myType" });
  });

  it("handles keyboard navigation with Space key", () => {
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
    
    fireEvent.keyDown(bodyRows[0], { key: ' ' });
    expect(onRowSelect).toHaveBeenCalledWith({ featureName: "foo", type: "myType" });
  });

  it("ignores other key presses", () => {
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
    
    fireEvent.keyDown(bodyRows[0], { key: 'a' });
    expect(onRowSelect).not.toHaveBeenCalled();
  });

  it("handles empty filteredLists", () => {
    const onRowSelect = jest.fn();
    render(
      <EntryTable
        filteredLists={{}}
        minCellWidth={50}
        onRowSelect={onRowSelect}
        selectedEntry={null}
        type={type}
      />
    );

    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
  });

  it("handles null filteredLists", () => {
    const onRowSelect = jest.fn();
    render(
      <EntryTable
        filteredLists={null}
        minCellWidth={50}
        onRowSelect={onRowSelect}
        selectedEntry={null}
        type={type}
      />
    );

    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
  });

  it("handles undefined filteredLists", () => {
    const onRowSelect = jest.fn();
    render(
      <EntryTable
        filteredLists={undefined}
        minCellWidth={50}
        onRowSelect={onRowSelect}
        selectedEntry={null}
        type={type}
      />
    );

    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
  });

  it("handles large number of rows correctly", () => {
    const largeLists = {
      Name: Array.from({ length: 20 }, (_, i) => `item${i}`),
      Value: Array.from({ length: 20 }, (_, i) => `${i * 10}`),
    };
    const onRowSelect = jest.fn();
    render(
      <EntryTable
        filteredLists={largeLists}
        minCellWidth={50}
        onRowSelect={onRowSelect}
        selectedEntry={null}
        type={type}
      />
    );

    const table = screen.getByRole("table");
    const [, tbody] = within(table).getAllByRole("rowgroup");
    const bodyRows = within(tbody).getAllByRole("row");
    
    expect(bodyRows.length).toBeGreaterThanOrEqual(8);
  });

  it("does not mark any row as selected when selectedEntry is null", () => {
    const onRowSelect = jest.fn();
    render(
      <EntryTable
        filteredLists={filteredLists}
        minCellWidth={50}
        onRowSelect={onRowSelect}
        selectedEntry={null}
        type={type}
      />
    );

    const table = screen.getByRole("table");
    const [, tbody] = within(table).getAllByRole("rowgroup");
    const bodyRows = within(tbody).getAllByRole("row");

    bodyRows.slice(0, 2).forEach((row) => {
      expect(row).not.toHaveClass("selectedRow");
    });
  });

  it("does not mark row as selected when type does not match", () => {
    const onRowSelect = jest.fn();
    const differentTypeEntry = { featureName: "foo", type: "differentType" };
    render(
      <EntryTable
        filteredLists={filteredLists}
        minCellWidth={50}
        onRowSelect={onRowSelect}
        selectedEntry={differentTypeEntry}
        type={type}
      />
    );

    const table = screen.getByRole("table");
    const [, tbody] = within(table).getAllByRole("rowgroup");
    const bodyRows = within(tbody).getAllByRole("row");

    expect(bodyRows[0]).not.toHaveClass("selectedRow");
  });

  it("marks row with aria-selected when selected", () => {
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

    expect(bodyRows[0]).toHaveAttribute("aria-selected", "true");
    expect(bodyRows[1]).toHaveAttribute("aria-selected", "false");
  });

  it("all data rows have tabIndex", () => {
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

    bodyRows.slice(0, 2).forEach((row) => {
      expect(row).toHaveAttribute("tabIndex", "0");
    });
  });

  it("has correct aria-label on table", () => {
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

    const table = screen.getByRole("table", { name: /data statistics table/i });
    expect(table).toBeInTheDocument();
  });
});
