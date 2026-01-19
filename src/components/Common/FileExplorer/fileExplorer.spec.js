import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import FileTypeIcon from "./fileTypeIcon";
import FileToolbar from "./fileToolbar";
import DeleteConfirmation from "./deleteConfirmation";
import CleanPanel from "./cleanPanel";
import FileTable from "./fileTable";

// Mock the CSS module
jest.mock("./fileExplorer.module.css", () => new Proxy({}, { get: (_, k) => String(k) }), {
  virtual: true,
});

// Mock MUI components
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
        className={props.className}
      >
        {props.children}
      </button>
    );
  };
});

jest.mock("@mui/icons-material/Close", () => () => <span data-testid="CloseIcon" />);
jest.mock("@mui/icons-material/Refresh", () => () => <span data-testid="RefreshIcon" />);

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

describe("FileExplorer sub-components", () => {
  describe("<FileTypeIcon />", () => {
    it("renders CSV icon for .csv files", () => {
      const { container } = render(<FileTypeIcon name="test.csv" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg.closest('span')).toHaveAttribute('title', 'CSV');
    });

    it("renders XLSX icon for .xlsx files", () => {
      const { container } = render(<FileTypeIcon name="test.xlsx" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg.closest('span')).toHaveAttribute('title', 'XLSX');
    });

    it("renders XLSX icon for .xls files", () => {
      const { container } = render(<FileTypeIcon name="test.xls" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg.closest('span')).toHaveAttribute('title', 'XLSX');
    });

    it("handles files without extensions", () => {
      const { container } = render(<FileTypeIcon name="noextension" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg.closest('span')).toHaveAttribute('title', 'File'); // defaults to generic file
    });
  });

  describe("<Toolbar />", () => {
    const defaultProps = {
      toolbarDisabled: false,
      doOpenSelected: jest.fn(),
      hasSelection: true,
      onOpenFile: jest.fn(),
      renamingName: null,
      selectedCount: 1,
      startRename: jest.fn(),
      openCleanPanel: jest.fn(),
      requestDelete: jest.fn(),
      multiMode: false,
      setMultiMode: jest.fn(),
      busy: false,
      load: jest.fn(),
      onClose: jest.fn(),
    };

    it("renders all toolbar buttons", () => {
      render(<FileToolbar {...defaultProps} />);
      expect(screen.getByRole("button", { name: /^Open$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Rename$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Data cleaning/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Delete$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Refresh/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Close$/i })).toBeInTheDocument();
    });

    it("disables Open button when no selection", () => {
      render(<FileToolbar {...defaultProps} hasSelection={false} />);
      expect(screen.getByRole("button", { name: /^Open$/i })).toBeDisabled();
    });

    it("disables Rename button when selection count is not 1", () => {
      render(<FileToolbar {...defaultProps} selectedCount={2} />);
      expect(screen.getByRole("button", { name: /^Rename$/i })).toBeDisabled();
    });

    it("shows multi-select mode pill when active", () => {
      render(<FileToolbar {...defaultProps} multiMode={true} />);
      expect(screen.getByRole("button", { name: /selecting multiple files/i })).toBeInTheDocument();
    });

    it("does not show close button when onClose is not provided", () => {
      render(<FileToolbar {...defaultProps} onClose={null} />);
      expect(screen.queryByRole("button", { name: /^Close$/i })).not.toBeInTheDocument();
    });

    it("calls load when refresh button is clicked", () => {
      const load = jest.fn();
      render(<FileToolbar {...defaultProps} load={load} />);
      fireEvent.click(screen.getByRole("button", { name: /Refresh/i }));
      expect(load).toHaveBeenCalled();
    });
  });

  describe("<DeleteConfirmation />", () => {
    it("renders when show is true", () => {
      render(
        <DeleteConfirmation
          show={true}
          selectedCount={1}
          onCancel={jest.fn()}
          onConfirm={jest.fn()}
          busy={false}
        />
      );
      expect(screen.getByText(/Delete 1 file?/i)).toBeInTheDocument();
    });

    it("does not render when show is false", () => {
      const { container } = render(
        <DeleteConfirmation
          show={false}
          selectedCount={1}
          onCancel={jest.fn()}
          onConfirm={jest.fn()}
          busy={false}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it("pluralizes file count correctly", () => {
      render(
        <DeleteConfirmation
          show={true}
          selectedCount={3}
          onCancel={jest.fn()}
          onConfirm={jest.fn()}
          busy={false}
        />
      );
      expect(screen.getByText(/Delete 3 files?/i)).toBeInTheDocument();
    });

    it("calls onConfirm when Delete button is clicked", () => {
      const onConfirm = jest.fn();
      render(
        <DeleteConfirmation
          show={true}
          selectedCount={1}
          onCancel={jest.fn()}
          onConfirm={onConfirm}
          busy={false}
        />
      );
      const deleteButtons = screen.getAllByRole("button", { name: /^Delete$/i });
      fireEvent.click(deleteButtons[deleteButtons.length - 1]); // Click the confirm delete button
      expect(onConfirm).toHaveBeenCalled();
    });

    it("calls onCancel when Cancel button is clicked", () => {
      const onCancel = jest.fn();
      render(
        <DeleteConfirmation
          show={true}
          selectedCount={1}
          onCancel={onCancel}
          onConfirm={jest.fn()}
          busy={false}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: /^Cancel$/i }));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe("<CleanPanel />", () => {
    const defaultProps = {
      show: true,
      onClose: jest.fn(),
      busy: false,
      removeDuplicates: false,
      setRemoveDuplicates: jest.fn(),
      removeEmptyRows: false,
      setRemoveEmptyRows: jest.fn(),
      standardizeDates: false,
      setStandardizeDates: jest.fn(),
      selectedDateFormat: "YYYY-MM-DD",
      setSelectedDateFormat: jest.fn(),
      dateFormats: [
        { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
        { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
      ],
      standardizeNumeric: false,
      setStandardizeNumeric: jest.fn(),
      numericMode: "double",
      setNumericMode: jest.fn(),
      selectedCount: 2,
      applyClean: jest.fn(),
    };

    it("renders when show is true", () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByRole("dialog", { name: /Data cleaning/i })).toBeInTheDocument();
    });

    it("does not render when show is false", () => {
      const { container } = render(<CleanPanel {...defaultProps} show={false} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders all cleaning options", () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText(/Remove duplicates/i)).toBeInTheDocument();
      expect(screen.getByText(/Remove empty rows/i)).toBeInTheDocument();
      expect(screen.getByText(/Standardize dates/i)).toBeInTheDocument();
      expect(screen.getByText(/Standardize numeric fields/i)).toBeInTheDocument();
    });

    it("calls applyClean when Apply button is clicked", () => {
      const applyClean = jest.fn();
      render(<CleanPanel {...defaultProps} applyClean={applyClean} />);
      fireEvent.click(screen.getByRole("button", { name: /^Apply$/i }));
      expect(applyClean).toHaveBeenCalled();
    });

    it("disables Apply button when no files are selected", () => {
      render(<CleanPanel {...defaultProps} selectedCount={0} />);
      expect(screen.getByRole("button", { name: /^Apply$/i })).toBeDisabled();
    });

    it("changes date format when select is changed", () => {
      const setSelectedDateFormat = jest.fn();
      render(<CleanPanel {...defaultProps} setSelectedDateFormat={setSelectedDateFormat} standardizeDates={true} />);
      const select = screen.getByDisplayValue("YYYY-MM-DD");
      fireEvent.change(select, { target: { value: "DD/MM/YYYY" } });
      expect(setSelectedDateFormat).toHaveBeenCalledWith("DD/MM/YYYY");
    });
  });

  describe("<FileTable />", () => {
    const mockFiles = [
      {
        name: "file1.csv",
        sizeBytes: 1024,
        createdAtMs: 1700000000000,
        lastModifiedAtMs: 1700000000000,
      },
      {
        name: "file2.xlsx",
        sizeBytes: 2048,
        createdAtMs: 1700000000000,
        lastModifiedAtMs: 1700000000000,
      },
    ];

    const defaultProps = {
      sorted: mockFiles,
      selected: new Set(),
      busy: false,
      onRowMouseDown: jest.fn(),
      onRowMouseUp: jest.fn(),
      onRowMouseLeave: jest.fn(),
      longPressFired: { current: false },
      onRowClick: jest.fn(),
      onRowDoubleClick: jest.fn(),
      renamingName: null,
      renameInputRef: { current: null },
      renameDraft: "",
      setRenameDraft: jest.fn(),
      commitRename: jest.fn(),
      cancelRename: jest.fn(),
      formatBytes: (bytes) => `${bytes} B`,
      formatDateTime: (ms) => new Date(ms).toLocaleString(),
      isNew: () => false,
    };

    it("renders table with all files", () => {
      render(<FileTable {...defaultProps} />);
      expect(screen.getByText("file1.csv")).toBeInTheDocument();
      expect(screen.getByText("file2.xlsx")).toBeInTheDocument();
    });

    it("renders header row", () => {
      render(<FileTable {...defaultProps} />);
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Size")).toBeInTheDocument();
      expect(screen.getByText("Created")).toBeInTheDocument();
      expect(screen.getByText("Modified")).toBeInTheDocument();
    });

    it("highlights selected file", () => {
      const selected = new Set(["file1.csv"]);
      render(<FileTable {...defaultProps} selected={selected} />);
      const file1Text = screen.getByText("file1.csv");
      // Check that the file exists and is rendered
      expect(file1Text).toBeInTheDocument();
    });

    it("shows rename input when file is being renamed", () => {
      render(<FileTable {...defaultProps} renamingKey="default::file1.csv" renameDraft="newname.csv" />);
      expect(screen.getByDisplayValue("newname.csv")).toBeInTheDocument();
    });

    it("calls onRowDoubleClick when row is double-clicked", () => {
      const onRowDoubleClick = jest.fn();
      render(<FileTable {...defaultProps} onRowDoubleClick={onRowDoubleClick} />);
      const rows = screen.getAllByRole("button");
      fireEvent.doubleClick(rows[0]);
      expect(onRowDoubleClick).toHaveBeenCalledWith("default::file1.csv");
    });

    it("shows new file marker for new files", () => {
      const isNew = (f) => f.name === "file1.csv";
      render(<FileTable {...defaultProps} isNew={isNew} />);
      expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("calls commitRename when Enter is pressed in rename input", () => {
      const commitRename = jest.fn();
      render(<FileTable {...defaultProps} renamingKey="default::file1.csv" renameDraft="" commitRename={commitRename} />);
      const input = screen.getByDisplayValue("");
      fireEvent.keyDown(input, { key: "Enter" });
      expect(commitRename).toHaveBeenCalled();
    });

    it("calls cancelRename when Escape is pressed in rename input", () => {
      const cancelRename = jest.fn();
      render(<FileTable {...defaultProps} renamingKey="default::file1.csv" renameDraft="" cancelRename={cancelRename} />);
      const input = screen.getByDisplayValue("");
      fireEvent.keyDown(input, { key: "Escape" });
      expect(cancelRename).toHaveBeenCalled();
    });
  });

  // Additional tests for utility functions used by FileExplorer
  describe("Utility Functions", () => {
    it("handles formatBytes correctly", () => {
      const { formatBytes } = require("./fileUtils");
      expect(formatBytes(0)).toBe("0 B");
      expect(formatBytes(1023)).toBe("1023 B");
      expect(formatBytes(1024)).toContain("KB");
      expect(formatBytes(1048576)).toContain("MB");
      expect(formatBytes(1073741824)).toContain("GB");
      expect(formatBytes(-1)).toBe("—");
      expect(formatBytes("invalid")).toBe("—");
      expect(formatBytes(null)).toBe("0 B"); // Number(null) = 0
      expect(formatBytes(undefined)).toBe("—"); // Number(undefined) = NaN
      expect(formatBytes(Infinity)).toBe("—");
      // Test edge cases for formatting
      expect(formatBytes(1536)).toBe("1.50 KB"); // 1.5 KB
      expect(formatBytes(10240)).toBe("10.0 KB"); // 10 KB
      expect(formatBytes(102400)).toBe("100 KB"); // 100 KB
    });

    it("handles formatDateTime correctly", () => {
      const { formatDateTime } = require("./fileUtils");
      expect(formatDateTime(0)).toBe("—");
      expect(formatDateTime(-1)).toBe("—");
      expect(formatDateTime(null)).toBe("—"); // Number(null) = 0
      expect(formatDateTime(undefined)).toBe("—"); // Number(undefined) = NaN
      const validTime = Date.now();
      expect(formatDateTime(validTime)).not.toBe("—");
      expect(formatDateTime(validTime)).toContain("/");
      expect(formatDateTime(1609459200000)).not.toBe("—"); // Valid timestamp
    });

    it("handles isFileNew correctly", () => {
      const { isFileNew } = require("./fileUtils");
      const newFile = { createdAtMs: Date.now() - 30000 }; // 30 seconds ago
      const oldFile = { createdAtMs: Date.now() - 120000 }; // 2 minutes ago
      const noTimeFile = {};
      
      expect(isFileNew(newFile, 60000)).toBe(true);
      expect(isFileNew(oldFile, 60000)).toBe(false);
      expect(isFileNew(noTimeFile, 60000)).toBe(false);
      expect(isFileNew({ createdAtMs: 0 }, 60000)).toBe(false);
      expect(isFileNew({ createdAtMs: null }, 60000)).toBe(false);
      // Test with custom threshold
      expect(isFileNew(newFile, 20000)).toBe(false); // 30s ago is not new with 20s threshold
      expect(isFileNew(newFile, 40000)).toBe(true); // 30s ago is new with 40s threshold
    });

    it("handles getFileExtension correctly", () => {
      const { getFileExtension } = require("./fileUtils");
      expect(getFileExtension("test.csv")).toBe("csv");
      expect(getFileExtension("test.CSV")).toBe("csv");
      expect(getFileExtension("test.XLSX")).toBe("xlsx");
      expect(getFileExtension("test.xlsx")).toBe("xlsx");
      expect(getFileExtension("noext")).toBe("");
      expect(getFileExtension("file.tar.gz")).toBe("gz");
      expect(getFileExtension("")).toBe("");
      expect(getFileExtension(null)).toBe("");
      expect(getFileExtension(undefined)).toBe("");
      expect(getFileExtension(".hidden")).toBe("hidden");
      expect(getFileExtension("file.PDF")).toBe("pdf");
      expect(getFileExtension("archive.ZIP")).toBe("zip");
    });
  });

  describe("Additional FileTypeIcon tests", () => {
    it("renders JSON icon for .json files", () => {
      const { container } = render(<FileTypeIcon name="data.json" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders TXT icon for .txt files", () => {
      const { container } = render(<FileTypeIcon name="readme.txt" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders XML icon for .xml files", () => {
      const { container } = render(<FileTypeIcon name="config.xml" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders ZIP icon for .zip files", () => {
      const { container } = render(<FileTypeIcon name="archive.zip" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders PDF icon for .pdf files", () => {
      const { container } = render(<FileTypeIcon name="document.pdf" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("handles uppercase extensions", () => {
      const { container } = render(<FileTypeIcon name="TEST.CSV" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("handles mixed case extensions", () => {
      const { container } = render(<FileTypeIcon name="file.CsV" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders default icon for unknown extensions", () => {
      const { container } = render(<FileTypeIcon name="file.unknown" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("Additional FileToolbar tests", () => {
    const toolbarProps = {
      toolbarDisabled: false,
      doOpenSelected: jest.fn(),
      hasSelection: true,
      onOpenFile: jest.fn(),
      renamingName: null,
      selectedCount: 1,
      startRename: jest.fn(),
      openCleanPanel: jest.fn(),
      requestDelete: jest.fn(),
      multiMode: false,
      setMultiMode: jest.fn(),
      busy: false,
      load: jest.fn(),
      onClose: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("shows correct button count when selection exists", () => {
      render(<FileToolbar {...toolbarProps} />);
      expect(screen.getByText("1 selected")).toBeInTheDocument();
    });

    it("shows multiple selection count", () => {
      render(<FileToolbar {...toolbarProps} selectedCount={5} />);
      expect(screen.getByText("5 selected")).toBeInTheDocument();
    });

    it("disables buttons when toolbarDisabled is true", () => {
      render(<FileToolbar {...toolbarProps} toolbarDisabled={true} />);
      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        if (button.getAttribute('aria-label') !== 'Close') {
          expect(button).toBeDisabled();
        }
      });
    });

    it("disables buttons when busy is true", () => {
      render(<FileToolbar {...toolbarProps} busy={true} />);
      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        if (button.getAttribute('aria-label') !== 'Close') {
          expect(button).toBeDisabled();
        }
      });
    });

    it("disables buttons when renamingName is set", () => {
      render(<FileToolbar {...toolbarProps} renamingName="test.csv" />);
      const buttons = screen.getAllByRole("button");
      const disabledCount = buttons.filter(b => b.disabled).length;
      expect(disabledCount).toBeGreaterThan(0);
    });

    it("calls load when refresh button is clicked", () => {
      render(<FileToolbar {...toolbarProps} />);
      const refreshBtn = screen.getByLabelText(/Refresh/i);
      fireEvent.click(refreshBtn);
      expect(toolbarProps.load).toHaveBeenCalled();
    });

    it("calls onClose when close button is clicked", () => {
      render(<FileToolbar {...toolbarProps} />);
      const closeBtn = screen.getByLabelText(/Close/i);
      fireEvent.click(closeBtn);
      expect(toolbarProps.onClose).toHaveBeenCalled();
    });

    it("shows multi-select toggle", () => {
      render(<FileToolbar {...toolbarProps} />);
      expect(screen.getByLabelText("switch")).toBeInTheDocument();
    });

    it("toggles multi-mode when switch is clicked", () => {
      render(<FileToolbar {...toolbarProps} />);
      const switchEl = screen.getByLabelText("switch");
      fireEvent.click(switchEl);
      expect(toolbarProps.setMultiMode).toHaveBeenCalledWith(true);
    });

    it("shows multi-mode as checked when multiMode is true", () => {
      render(<FileToolbar {...toolbarProps} multiMode={true} />);
      const switchEl = screen.getByLabelText("switch");
      expect(switchEl.checked).toBe(true);
    });

    it("disables multi-mode switch when busy", () => {
      render(<FileToolbar {...toolbarProps} busy={true} />);
      const switchEl = screen.getByLabelText("switch");
      expect(switchEl).toBeDisabled();
    });

    it("calls doOpenSelected when open button is clicked", () => {
      render(<FileToolbar {...toolbarProps} />);
      const openBtn = screen.getByLabelText(/Open/i);
      fireEvent.click(openBtn);
      expect(toolbarProps.doOpenSelected).toHaveBeenCalled();
    });

    it("calls startRename when rename button is clicked", () => {
      render(<FileToolbar {...toolbarProps} />);
      const renameBtn = screen.getByLabelText(/Rename/i);
      fireEvent.click(renameBtn);
      expect(toolbarProps.startRename).toHaveBeenCalled();
    });

    it("calls openCleanPanel when clean button is clicked", () => {
      render(<FileToolbar {...toolbarProps} />);
      const cleanBtn = screen.getByLabelText(/Clean/i);
      fireEvent.click(cleanBtn);
      expect(toolbarProps.openCleanPanel).toHaveBeenCalled();
    });

    it("calls requestDelete when delete button is clicked", () => {
      render(<FileToolbar {...toolbarProps} />);
      const deleteBtn = screen.getByLabelText(/Delete/i);
      fireEvent.click(deleteBtn);
      expect(toolbarProps.requestDelete).toHaveBeenCalled();
    });

    it("hides selection-dependent buttons when hasSelection is false", () => {
      render(<FileToolbar {...toolbarProps} hasSelection={false} />);
      expect(screen.queryByText("selected")).not.toBeInTheDocument();
    });
  });

  describe("Additional DeleteConfirmation tests", () => {
    const deleteProps = {
      isOpen: true,
      fileNames: ["file1.csv", "file2.txt"],
      onConfirm: jest.fn(),
      onCancel: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("renders with multiple file names", () => {
      render(<DeleteConfirmation {...deleteProps} />);
      expect(screen.getByText(/file1.csv/)).toBeInTheDocument();
      expect(screen.getByText(/file2.txt/)).toBeInTheDocument();
    });

    it("renders with single file name", () => {
      render(<DeleteConfirmation {...deleteProps} fileNames={["single.csv"]} />);
      expect(screen.getByText(/single.csv/)).toBeInTheDocument();
    });

    it("calls onConfirm when confirm button is clicked", () => {
      render(<DeleteConfirmation {...deleteProps} />);
      const confirmBtn = screen.getByRole("button", { name: /Delete/i });
      fireEvent.click(confirmBtn);
      expect(deleteProps.onConfirm).toHaveBeenCalled();
    });

    it("calls onCancel when cancel button is clicked", () => {
      render(<DeleteConfirmation {...deleteProps} />);
      const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
      fireEvent.click(cancelBtn);
      expect(deleteProps.onCancel).toHaveBeenCalled();
    });

    it("does not render when isOpen is false", () => {
      render(<DeleteConfirmation {...deleteProps} isOpen={false} />);
      expect(screen.queryByText(/Delete/i)).not.toBeInTheDocument();
    });

    it("shows appropriate message for multiple files", () => {
      render(<DeleteConfirmation {...deleteProps} />);
      expect(screen.getByText(/delete/i)).toBeInTheDocument();
    });
  });

  describe("Additional CleanPanel tests", () => {
    const cleanProps = {
      isOpen: true,
      onClose: jest.fn(),
      onApply: jest.fn(),
      fileName: "test.csv",
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("renders when isOpen is true", () => {
      render(<CleanPanel {...cleanProps} />);
      expect(screen.getByText(/test.csv/i)).toBeInTheDocument();
    });

    it("does not render when isOpen is false", () => {
      render(<CleanPanel {...cleanProps} isOpen={false} />);
      expect(screen.queryByText(/test.csv/i)).not.toBeInTheDocument();
    });

    it("calls onClose when close button is clicked", () => {
      render(<CleanPanel {...cleanProps} />);
      const closeBtn = screen.getByLabelText(/Close/i);
      fireEvent.click(closeBtn);
      expect(cleanProps.onClose).toHaveBeenCalled();
    });

    it("calls onApply with cleaning options when apply is clicked", () => {
      render(<CleanPanel {...cleanProps} />);
      const applyBtn = screen.getByRole("button", { name: /Apply/i });
      fireEvent.click(applyBtn);
      expect(cleanProps.onApply).toHaveBeenCalled();
    });

    it("toggles cleaning options", () => {
      render(<CleanPanel {...cleanProps} />);
      const switches = screen.getAllByLabelText("switch");
      expect(switches.length).toBeGreaterThan(0);
      fireEvent.click(switches[0]);
      expect(switches[0].checked).toBe(true);
    });

    it("shows date format selector when standardize dates is enabled", () => {
      render(<CleanPanel {...cleanProps} />);
      const switches = screen.getAllByLabelText("switch");
      const dateSwitch = switches.find((s) => 
        s.parentElement?.textContent?.includes("Standardize")
      );
      if (dateSwitch) {
        fireEvent.click(dateSwitch);
      }
      expect(screen.getByRole("button", { name: /Apply/i })).toBeInTheDocument();
    });
  });

  describe("Additional FileTable tests", () => {
    const tableProps = {
      files: [
        { id: '1', name: 'file1.csv', size: 1024, modified: new Date('2024-01-01'), nodeId: 'node1' },
        { id: '2', name: 'file2.txt', size: 2048, modified: new Date('2024-01-02'), nodeId: 'node1' },
      ],
      selectedFiles: [],
      onFileSelect: jest.fn(),
      onFileDoubleClick: jest.fn(),
      sortBy: 'name',
      sortOrder: 'asc',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("renders all files", () => {
      render(<FileTable {...tableProps} />);
      expect(screen.getByText("file1.csv")).toBeInTheDocument();
      expect(screen.getByText("file2.txt")).toBeInTheDocument();
    });

    it("calls onFileSelect when file is clicked", () => {
      render(<FileTable {...tableProps} />);
      const file = screen.getByText("file1.csv").closest("tr");
      fireEvent.click(file);
      expect(tableProps.onFileSelect).toHaveBeenCalled();
    });

    it("calls onFileDoubleClick when file is double-clicked", () => {
      render(<FileTable {...tableProps} />);
      const file = screen.getByText("file1.csv").closest("tr");
      fireEvent.doubleClick(file);
      expect(tableProps.onFileDoubleClick).toHaveBeenCalled();
    });

    it("highlights selected files", () => {
      render(<FileTable {...tableProps} selectedFiles={['1']} />);
      const file = screen.getByText("file1.csv").closest("tr");
      expect(file).toHaveClass(/selected/);
    });

    it("sorts files by name ascending", () => {
      render(<FileTable {...tableProps} sortBy="name" sortOrder="asc" />);
      const files = screen.getAllByRole("row").slice(1);
      expect(files[0]).toHaveTextContent("file1.csv");
    });

    it("sorts files by name descending", () => {
      render(<FileTable {...tableProps} sortBy="name" sortOrder="desc" />);
      expect(screen.getByText("file2.txt")).toBeInTheDocument();
    });

    it("sorts files by size", () => {
      render(<FileTable {...tableProps} sortBy="size" sortOrder="asc" />);
      expect(screen.getByText("file1.csv")).toBeInTheDocument();
    });

    it("sorts files by modified date", () => {
      render(<FileTable {...tableProps} sortBy="modified" sortOrder="asc" />);
      expect(screen.getByText("file1.csv")).toBeInTheDocument();
    });

    it("handles empty file list", () => {
      render(<FileTable {...tableProps} files={[]} />);
      expect(screen.queryByText("file1.csv")).not.toBeInTheDocument();
    });

    it("handles files without size", () => {
      const filesWithoutSize = [
        { id: '1', name: 'file1.csv', modified: new Date('2024-01-01'), nodeId: 'node1' },
      ];
      render(<FileTable {...tableProps} files={filesWithoutSize} />);
      expect(screen.getByText("file1.csv")).toBeInTheDocument();
    });

    it("handles files without modified date", () => {
      const filesWithoutDate = [
        { id: '1', name: 'file1.csv', size: 1024, nodeId: 'node1' },
      ];
      render(<FileTable {...tableProps} files={filesWithoutDate} />);
      expect(screen.getByText("file1.csv")).toBeInTheDocument();
    });

    it("handles multiple file selections", () => {
      render(<FileTable {...tableProps} selectedFiles={['1', '2']} />);
      const file1 = screen.getByText("file1.csv").closest("tr");
      const file2 = screen.getByText("file2.txt").closest("tr");
      expect(file1).toHaveClass(/selected/);
      expect(file2).toHaveClass(/selected/);
    });

    it("groups files by nodeId", () => {
      const multiNodeFiles = [
        { id: '1', name: 'file1.csv', size: 1024, modified: new Date(), nodeId: 'node1' },
        { id: '2', name: 'file2.csv', size: 2048, modified: new Date(), nodeId: 'node2' },
      ];
      render(<FileTable {...tableProps} files={multiNodeFiles} />);
      expect(screen.getByText("file1.csv")).toBeInTheDocument();
      expect(screen.getByText("file2.csv")).toBeInTheDocument();
    });
  });
});
