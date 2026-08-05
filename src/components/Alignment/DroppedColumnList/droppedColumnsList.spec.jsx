import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import DroppedColumnsList from "./droppedColumnsList";

vi.mock(
  "./droppedColumnsList.module.css",
  () => ({
    __esModule: true,
    default: new Proxy(
      {},
      {
        get: (_, key) => String(key),
      }
    ),
  }),
  { virtual: true }
);

vi.mock("@mui/icons-material/Close", () => ({
  __esModule: true,
  default: () => <span data-testid="CloseIcon" />,
}));

const makeDataTransfer = (payloadObj) => ({
  getData: vi.fn((type) =>
    type === "column" ? JSON.stringify(payloadObj) : ""
  ),
  setData: vi.fn(),
  dropEffect: "move",
  effectAllowed: "all",
  files: [],
  items: [],
  types: ["column"],
});

describe("DroppedColumnsList", () => {
  it("renders empty state with drop text when no groups", () => {
    render(
      <DroppedColumnsList
        groups={[]}
        onDeleteGroup={vi.fn()}
        onDrop={vi.fn()}
        height={200}
      />
    );

    expect(
      screen.getByText(/click or drop columns here/i)
    ).toBeInTheDocument();
  });

  it("applies height style to drop area", () => {
    const { container } = render(
      <DroppedColumnsList
        groups={[]}
        onDeleteGroup={vi.fn()}
        onDrop={vi.fn()}
        height={300}
      />
    );

    const dropArea = container.firstChild;
    expect(dropArea).toHaveStyle({ height: "300px" });
  });

  it("renders categorical column with categories", () => {
    const groups = [
      {
        nodeId: "n1",
        column: "color",
        values: ["red", "blue", "green"],
        fileName: "colors.csv",
        color: "#ff0000",
      },
    ];

    render(
      <DroppedColumnsList
        groups={groups}
        onDeleteGroup={vi.fn()}
        onDrop={vi.fn()}
        height={200}
      />
    );

    expect(screen.getByText("color")).toBeInTheDocument();
    expect(screen.getByText("from colors.csv")).toBeInTheDocument();
    expect(screen.getByText("Type: Categorical")).toBeInTheDocument();
    expect(screen.getByText("Categories:")).toBeInTheDocument();
    expect(screen.getByText("red")).toBeInTheDocument();
    expect(screen.getByText("blue")).toBeInTheDocument();
    expect(screen.getByText("green")).toBeInTheDocument();
  });

  it("renders integer column with correct type", () => {
    const groups = [
      {
        nodeId: "n1",
        column: "age",
        values: ["integer", "min:0", "max:100"],
        fileName: "data.csv",
        color: "#0000ff",
      },
    ];

    render(
      <DroppedColumnsList
        groups={groups}
        onDeleteGroup={vi.fn()}
        onDrop={vi.fn()}
        height={200}
      />
    );

    expect(screen.getByText("Type: Integer")).toBeInTheDocument();
    expect(
      screen.getByText("This column represents numerical data.")
    ).toBeInTheDocument();
  });

  it("renders double column with correct type", () => {
    const groups = [
      {
        nodeId: "n1",
        column: "price",
        values: ["double", "min:0.0", "max:999.99"],
        fileName: "prices.csv",
        color: "#ff00ff",
      },
    ];

    render(
      <DroppedColumnsList
        groups={groups}
        onDeleteGroup={vi.fn()}
        onDrop={vi.fn()}
        height={200}
      />
    );

    expect(screen.getByText("Type: Double")).toBeInTheDocument();
    expect(
      screen.getByText("This column represents numerical data.")
    ).toBeInTheDocument();
  });

  it("renders date column with correct type", () => {
    const groups = [
      {
        nodeId: "n1",
        column: "birthdate",
        values: ["date", "earliest:2000-01-01", "latest:2024-12-31"],
        fileName: "dates.csv",
        color: "#00ff00",
      },
    ];

    render(
      <DroppedColumnsList
        groups={groups}
        onDeleteGroup={vi.fn()}
        onDrop={vi.fn()}
        height={200}
      />
    );

    expect(screen.getByText("Type: Date")).toBeInTheDocument();
    expect(
      screen.getByText("This column represents date values.")
    ).toBeInTheDocument();
  });

  it("calls onDeleteGroup when delete icon is clicked", () => {
    const onDeleteGroup = vi.fn();
    const groups = [
      {
        nodeId: "n1",
        column: "test",
        values: ["a", "b"],
        fileName: "file.csv",
        color: "#111111",
      },
    ];

    render(
      <DroppedColumnsList
        groups={groups}
        onDeleteGroup={onDeleteGroup}
        onDrop={vi.fn()}
        height={200}
      />
    );

    const deleteIcon = screen.getByTestId("CloseIcon");
    fireEvent.click(deleteIcon.parentElement);

    expect(onDeleteGroup).toHaveBeenCalledWith(groups[0]);
  });

  it("calls onDrop when item is dropped", () => {
    const onDrop = vi.fn();

    render(
      <DroppedColumnsList
        groups={[]}
        onDeleteGroup={vi.fn()}
        onDrop={onDrop}
        height={200}
      />
    );

    const dropArea =
      screen.getByText(/click or drop columns here/i).parentElement;

    const droppedData = {
      nodeId: "n1",
      column: "color",
      values: ["red", "blue"],
      fileName: "file.csv",
      color: "#336699",
    };

    fireEvent.drop(dropArea, {
      dataTransfer: makeDataTransfer(droppedData),
    });

    expect(onDrop).toHaveBeenCalled();
  });

  it("prevents default on dragOver", () => {
    render(
      <DroppedColumnsList
        groups={[]}
        onDeleteGroup={vi.fn()}
        onDrop={vi.fn()}
        height={200}
      />
    );

    const dropArea =
      screen.getByText(/click or drop columns here/i).parentElement;

    const event = new Event("dragover", {
      bubbles: true,
      cancelable: true,
    });

    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    dropArea.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("renders multiple groups", () => {
    const groups = [
      {
        nodeId: "n1",
        column: "color",
        values: ["red", "blue"],
        fileName: "colors.csv",
        color: "#ff0000",
      },
      {
        nodeId: "n2",
        column: "age",
        values: ["integer", "min:0", "max:100"],
        fileName: "ages.csv",
        color: "#0000ff",
      },
    ];

    render(
      <DroppedColumnsList
        groups={groups}
        onDeleteGroup={vi.fn()}
        onDrop={vi.fn()}
        height={200}
      />
    );

    expect(screen.getByText("color")).toBeInTheDocument();
    expect(screen.getByText("age")).toBeInTheDocument();
    expect(screen.getByText("from colors.csv")).toBeInTheDocument();
    expect(screen.getByText("from ages.csv")).toBeInTheDocument();
  });
});