import React from "react";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import FileExplorer from "../FileExplorer/fileExplorer";

jest.mock("./fileExplorer.module.css", () => new Proxy({}, { get: (_, k) => String(k) }), {
  virtual: true,
});

jest.mock("react-transition-group", () => ({
  CSSTransition: ({ children, in: inProp }) => (inProp === false ? null : <>{children}</>),
}));

jest.mock("react-switch", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ checked, onChange, disabled }) => (
      <input
        type="checkbox"
        aria-label="switch"
        checked={!!checked}
        disabled={!!disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
    ),
  };
});

jest.mock("@mui/material/IconButton", () => {
  const React = require("react");
  return function IconButton(props) {
    return (
      <button
        type="button"
        aria-label={props["aria-label"]}
        title={props.title}
        disabled={props.disabled}
        onClick={props.onClick}
      >
        {props.children}
      </button>
    );
  };
});

jest.mock("@mui/icons-material/Close", () => () => <span data-testid="CloseIcon" />);
jest.mock("@mui/icons-material/Refresh", () => () => <span data-testid="RefreshIcon" />);

const mockListExplorerFiles = jest.fn();
const mockRenameExplorerFile = jest.fn();
const mockDeleteExplorerFile = jest.fn();
const mockCleanExplorerFile = jest.fn();

jest.mock("../../../util/petitionHandler", () => ({
  __esModule: true,
  listExplorerFiles: (...a) => mockListExplorerFiles(...a),
  renameExplorerFile: (...a) => mockRenameExplorerFile(...a),
  deleteExplorerFile: (...a) => mockDeleteExplorerFile(...a),
  cleanExplorerFile: (...a) => mockCleanExplorerFile(...a),
}));

const flush = async () => {
  await Promise.resolve();
};

describe("<FileExplorer />", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb();
      return 0;
    });
  });

  afterAll(() => {
    window.requestAnimationFrame.mockRestore();
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads and shows empty state "No files available"', async () => {
    mockListExplorerFiles.mockResolvedValueOnce([]);

    render(<FileExplorer category="DATASETS" isOpen={true} />);

    await flush();
    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(mockListExplorerFiles).toHaveBeenCalledWith("DATASETS");
    expect(await screen.findByText(/no files available/i)).toBeInTheDocument();
  });

  it("selects a file and opens it via the Open button", async () => {
    const onOpenFile = jest.fn();
    mockListExplorerFiles.mockResolvedValueOnce([
      {
        name: "a.csv",
        sizeBytes: 1234,
        createdAtMs: 1700000000000,
        lastModifiedAtMs: 1700000000000,
      },
    ]);

    render(<FileExplorer category="DATASETS" isOpen={true} onOpenFile={onOpenFile} />);

    await flush();
    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(await screen.findByText("a.csv")).toBeInTheDocument();

    fireEvent.click(screen.getByText("a.csv"));

    const openBtn = screen.getByRole("button", { name: /^Open$/i });
    expect(openBtn).toBeEnabled();

    fireEvent.click(openBtn);
    expect(onOpenFile).toHaveBeenCalledWith("a.csv");
  });

  it("renames a selected file (Rename -> inline input -> Enter)", async () => {
    mockListExplorerFiles
      .mockResolvedValueOnce([
        {
          name: "old.csv",
          sizeBytes: 10,
          createdAtMs: 1700000000000,
          lastModifiedAtMs: 1700000000000,
        },
      ])
      .mockResolvedValueOnce([
        {
          name: "new.csv",
          sizeBytes: 10,
          createdAtMs: 1700000000000,
          lastModifiedAtMs: 1700000000000,
        },
      ]);

    mockRenameExplorerFile.mockResolvedValueOnce();

    render(<FileExplorer category="DATASETS" isOpen={true} />);

    await flush();
    act(() => {
      jest.advanceTimersByTime(50);
    });

    const oldName = await screen.findByText("old.csv");
    fireEvent.click(oldName);

    const renameBtn = screen.getByRole("button", { name: /^Rename$/i });
    expect(renameBtn).toBeEnabled();
    fireEvent.click(renameBtn);

    const input = screen.getByDisplayValue("old.csv");
    fireEvent.change(input, { target: { value: "new.csv" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await flush();

    expect(mockRenameExplorerFile).toHaveBeenCalledWith("DATASETS", "old.csv", "new.csv");

    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(await screen.findByText("new.csv")).toBeInTheDocument();
  });

  it("deletes selected file via confirmation dialog", async () => {
    mockListExplorerFiles
      .mockResolvedValueOnce([
        {
          name: "del.csv",
          sizeBytes: 10,
          createdAtMs: 1700000000000,
          lastModifiedAtMs: 1700000000000,
        },
      ])
      .mockResolvedValueOnce([]);

    mockDeleteExplorerFile.mockResolvedValueOnce();

    render(<FileExplorer category="DATASETS" isOpen={true} />);

    await flush();
    act(() => {
      jest.advanceTimersByTime(50);
    });

    fireEvent.click(await screen.findByText("del.csv"));

    // toolbar delete
    fireEvent.click(screen.getByRole("button", { name: /^Delete$/i }));

    const dialog = screen.getByRole("dialog", { name: /delete confirmation/i });
    expect(dialog).toBeInTheDocument();

    // confirm delete inside dialog (avoid clashing with toolbar Delete)
    fireEvent.click(within(dialog).getByRole("button", { name: /^Delete$/i }));

    await flush();

    expect(mockDeleteExplorerFile).toHaveBeenCalledWith("DATASETS", "del.csv");
  });

  it("opens cleaning panel and applies cleaning to selected file", async () => {
    mockListExplorerFiles.mockResolvedValueOnce([
      {
        name: "clean.csv",
        sizeBytes: 10,
        createdAtMs: 1700000000000,
        lastModifiedAtMs: 1700000000000,
      },
    ]);
    mockCleanExplorerFile.mockResolvedValueOnce();

    render(<FileExplorer category="DATASETS" isOpen={true} />);

    await flush();
    act(() => {
      jest.advanceTimersByTime(50);
    });

    fireEvent.click(await screen.findByText("clean.csv"));

    fireEvent.click(screen.getByRole("button", { name: /data cleaning/i }));

    const panel = screen.getByRole("dialog", { name: /data cleaning/i });
    expect(panel).toBeInTheDocument();

    const applyBtn = screen.getByRole("button", { name: /^Apply$/i });
    expect(applyBtn).toBeEnabled();

    fireEvent.click(applyBtn);

    await flush();

    expect(mockCleanExplorerFile).toHaveBeenCalledWith("DATASETS", "clean.csv");
  });
});
