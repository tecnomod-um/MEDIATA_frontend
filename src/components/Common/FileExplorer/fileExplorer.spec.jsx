import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import FileExplorer from "./fileExplorer";
import FileTypeIcon from "./fileTypeIcon";
import FileToolbar from "./fileToolbar";
import DeleteConfirmation from "./deleteConfirmation";
import CleanPanel from "./cleanPanel";
import FileTable from "./fileTable";
import * as petitionHandler from "../../../util/petitionHandler";

vi.mock("../../../util/petitionHandler", () => ({
  __esModule: true,
  listExplorerFiles: vi.fn(),
  renameExplorerFile: vi.fn(),
  deleteExplorerFile: vi.fn(),
  cleanExplorerFile: vi.fn(),
  processSelectedDatasets: vi.fn(),
  getProcessSelectedDatasetsStatus: vi.fn(),
  getProcessSelectedDatasetsResult: vi.fn(),
}));

vi.mock("../../../util/nodeAxiosSetup", () => ({
  __esModule: true,
  updateNodeAxiosBaseURL: vi.fn(),
}));

vi.mock("react-toastify", () => ({
  __esModule: true,
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("react-router-dom", () => ({
  __esModule: true,
  useNavigate: vi.fn(() => vi.fn()),
}));

const cssModuleMock = new Proxy(
  {},
  {
    get: (_, key) => String(key),
  }
);

vi.mock("./fileExplorer.module.css", () => ({
  __esModule: true,
  default: new Proxy(
    {},
    {
      get: (_, key) => String(key),
    }
  ),
}));

vi.mock("@mui/material/IconButton", () => ({
  __esModule: true,
  default: function IconButton(props) {
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
  },
}));

vi.mock("@mui/icons-material/Close", () => ({
  __esModule: true,
  default: () => <span data-testid="CloseIcon" />,
}));

vi.mock("@mui/icons-material/Refresh", () => ({
  __esModule: true,
  default: () => <span data-testid="RefreshIcon" />,
}));

vi.mock("@mui/icons-material/ArrowBack", () => ({
  __esModule: true,
  default: () => <span data-testid="ArrowBackIcon" />,
}));

vi.mock("react-switch", () => ({
  __esModule: true,
  default: ({ checked, onChange, disabled, ...props }) => (
    <input
      type="checkbox"
      role="switch"
      aria-label={props["aria-label"] || "switch"}
      checked={!!checked}
      disabled={!!disabled}
      onChange={(e) => onChange?.(e.target.checked)}
    />
  ),
}));

vi.mock("react-transition-group", () => ({
  __esModule: true,
  CSSTransition: ({ in: inProp, children }) => (inProp ? <>{children}</> : null),
}));
describe("FileExplorer Main Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    petitionHandler.listExplorerFiles.mockResolvedValue([
      {
        name: "file1.csv",
        sizeBytes: 1024,
        createdAtMs: Date.now() - 50000,
        lastModifiedAtMs: Date.now() - 30000,
      },
      {
        name: "file2.xlsx",
        sizeBytes: 2048,
        createdAtMs: Date.now() - 100000,
        lastModifiedAtMs: Date.now() - 50000,
      },
    ]);
  });

  test("renders FileExplorer with nodes", async () => {
    const nodes = [{ nodeId: "node1", serviceUrl: "http://test.com", name: "Test Node" }];
    render(<FileExplorer nodes={nodes} category="clinical" isOpen={true} />);

    await waitFor(() => {
      expect(petitionHandler.listExplorerFiles).toHaveBeenCalled();
    });
  });

  test("loads files on mount", async () => {
    const nodes = [{ nodeId: "node1", serviceUrl: "http://test.com", name: "Test Node" }];
    render(<FileExplorer nodes={nodes} category="clinical" isOpen={true} />);

    await waitFor(() => {
      expect(screen.queryByText("file1.csv")).toBeInTheDocument();
    });
  });

  test("calls listExplorerFiles even with empty nodes array", async () => {
    render(<FileExplorer nodes={[]} category="clinical" isOpen={true} />);

    await waitFor(() => {
      expect(petitionHandler.listExplorerFiles).toHaveBeenCalledWith("clinical");
    });
  });

  test("calls listExplorerFiles with correct parameters", async () => {
    const nodes = [
      { nodeId: "node1", serviceUrl: "http://test1.com", name: "Node 1" },
      { nodeId: "node2", serviceUrl: "http://test2.com", name: "Node 2" },
    ];
    render(<FileExplorer nodes={nodes} category="clinical" isOpen={true} />);

    await waitFor(() => {
      expect(petitionHandler.listExplorerFiles).toHaveBeenCalledWith("clinical");
    });
  });

  test("handles API error gracefully", async () => {
    petitionHandler.listExplorerFiles.mockRejectedValue(new Error("API Error"));
    const nodes = [{ nodeId: "node1", serviceUrl: "http://test.com", name: "Test Node" }];

    render(<FileExplorer nodes={nodes} category="clinical" isOpen={true} />);

    await waitFor(() => {
      expect(petitionHandler.listExplorerFiles).toHaveBeenCalled();
    });
  });

  test("does not load when isOpen is false", () => {
    const nodes = [{ nodeId: "node1", serviceUrl: "http://test.com", name: "Test Node" }];
    render(<FileExplorer nodes={nodes} category="clinical" isOpen={false} />);

    expect(petitionHandler.listExplorerFiles).not.toHaveBeenCalled();
  });

  test("handles pre-selected files", async () => {
    const nodes = [{ nodeId: "node1", serviceUrl: "http://test.com", name: "Test Node" }];
    const preSelectedFiles = { node1: ["file1.csv"] };

    render(
      <FileExplorer
        nodes={nodes}
        category="clinical"
        isOpen={true}
        preSelectedFiles={preSelectedFiles}
      />
    );

    await waitFor(() => {
      expect(petitionHandler.listExplorerFiles).toHaveBeenCalled();
    });
  });

  test("calls onFilesOpened when provided", async () => {
    const onFilesOpened = vi.fn();
    const nodes = [{ nodeId: "node1", serviceUrl: "http://test.com", name: "Test Node" }];

    render(
      <FileExplorer
        nodes={nodes}
        category="clinical"
        isOpen={true}
        onFilesOpened={onFilesOpened}
      />
    );

    await waitFor(() => {
      expect(petitionHandler.listExplorerFiles).toHaveBeenCalled();
    });
  });

  test("renders without onClose prop", async () => {
    const nodes = [{ nodeId: "node1", serviceUrl: "http://test.com", name: "Test Node" }];
    render(<FileExplorer nodes={nodes} category="clinical" isOpen={true} />);

    await waitFor(() => {
      expect(petitionHandler.listExplorerFiles).toHaveBeenCalled();
    });
  });

  test("renders with onOpenFile callback", async () => {
    const onOpenFile = vi.fn();
    const nodes = [{ nodeId: "node1", serviceUrl: "http://test.com", name: "Test Node" }];
    render(
      <FileExplorer
        nodes={nodes}
        category="clinical"
        isOpen={true}
        onOpenFile={onOpenFile}
      />
    );

    await waitFor(() => {
      expect(petitionHandler.listExplorerFiles).toHaveBeenCalled();
    });
  });

  test("renders with onFilesSelected callback", async () => {
    const onFilesSelected = vi.fn();
    const nodes = [{ nodeId: "node1", serviceUrl: "http://test.com", name: "Test Node" }];
    render(
      <FileExplorer
        nodes={nodes}
        category="clinical"
        isOpen={true}
        onFilesSelected={onFilesSelected}
      />
    );

    await waitFor(() => {
      expect(petitionHandler.listExplorerFiles).toHaveBeenCalled();
    });
  });

  test("renders with autoProcess enabled", async () => {
    const nodes = [{ nodeId: "node1", serviceUrl: "http://test.com", name: "Test Node" }];
    render(<FileExplorer nodes={nodes} category="clinical" isOpen={true} autoProcess={true} />);

    await waitFor(() => {
      expect(petitionHandler.listExplorerFiles).toHaveBeenCalled();
    });
  });

  test("handles multiple file loading calls", async () => {
    const nodes = [{ nodeId: "node1", serviceUrl: "http://test.com", name: "Test Node" }];
    const { rerender } = render(<FileExplorer nodes={nodes} category="clinical" isOpen={true} />);

    await waitFor(() => {
      expect(petitionHandler.listExplorerFiles).toHaveBeenCalledTimes(1);
    });

    rerender(<FileExplorer nodes={nodes} category="clinical" isOpen={true} />);
    expect(petitionHandler.listExplorerFiles).toHaveBeenCalledTimes(1);
  });

  test("displays files after successful load", async () => {
    const nodes = [{ nodeId: "node1", serviceUrl: "http://test.com", name: "Test Node" }];
    render(<FileExplorer nodes={nodes} category="clinical" isOpen={true} />);

    await waitFor(() => {
      expect(screen.queryByText("file1.csv")).toBeInTheDocument();
      expect(screen.queryByText("file2.xlsx")).toBeInTheDocument();
    });
  });

  test("handles nodes changing from empty to populated", async () => {
    const { rerender } = render(<FileExplorer nodes={[]} category="clinical" isOpen={true} />);

    await waitFor(() => {
      expect(petitionHandler.listExplorerFiles).toHaveBeenCalledTimes(1);
    });

    const nodes = [{ nodeId: "node1", serviceUrl: "http://test.com", name: "Test Node" }];
    rerender(<FileExplorer nodes={nodes} category="clinical" isOpen={true} />);

    await waitFor(() => {
      expect(petitionHandler.listExplorerFiles).toHaveBeenCalledTimes(2);
    });
  });

  test("handles category change", async () => {
    const nodes = [{ nodeId: "node1", serviceUrl: "http://test.com", name: "Test Node" }];
    const { rerender } = render(<FileExplorer nodes={nodes} category="clinical" isOpen={true} />);

    await waitFor(() => {
      expect(petitionHandler.listExplorerFiles).toHaveBeenCalledWith("clinical");
    });

    rerender(<FileExplorer nodes={nodes} category="research" isOpen={true} />);

    await waitFor(() => {
      expect(petitionHandler.listExplorerFiles).toHaveBeenCalledWith("research");
    });
  });

  test("handles opening and closing", () => {
    const nodes = [{ nodeId: "node1", serviceUrl: "http://test.com", name: "Test Node" }];
    const { rerender } = render(<FileExplorer nodes={nodes} category="clinical" isOpen={false} />);

    expect(petitionHandler.listExplorerFiles).not.toHaveBeenCalled();

    rerender(<FileExplorer nodes={nodes} category="clinical" isOpen={true} />);
    expect(petitionHandler.listExplorerFiles).toHaveBeenCalled();
  });

  test("renders with onClose callback", async () => {
    const onClose = vi.fn();
    const nodes = [{ nodeId: "node1", serviceUrl: "http://test.com", name: "Test Node" }];
    render(
      <FileExplorer
        nodes={nodes}
        category="clinical"
        isOpen={true}
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(petitionHandler.listExplorerFiles).toHaveBeenCalled();
    });
  });
});

describe("FileExplorer sub-components", () => {
  describe("<FileTypeIcon />", () => {
    it("renders CSV icon for .csv files", () => {
      render(<FileTypeIcon name="test.csv" />);
      expect(screen.getByTitle("CSV")).toBeInTheDocument();
    });

    it("renders XLSX icon for .xlsx files", () => {
      render(<FileTypeIcon name="test.xlsx" />);
      expect(screen.getByTitle("XLSX")).toBeInTheDocument();
    });

    it("renders XLSX icon for .xls files", () => {
      render(<FileTypeIcon name="test.xls" />);
      expect(screen.getByTitle("XLSX")).toBeInTheDocument();
    });

    it("handles files without extensions", () => {
      render(<FileTypeIcon name="noextension" />);
      expect(screen.getByTitle("File")).toBeInTheDocument();
    });
  });

  describe("<Toolbar />", () => {
    const defaultProps = {
      toolbarDisabled: false,
      doOpenSelected: vi.fn(),
      hasSelection: true,
      onOpenFile: vi.fn(),
      renamingName: null,
      selectedCount: 1,
      startRename: vi.fn(),
      openCleanPanel: vi.fn(),
      requestDelete: vi.fn(),
      multiMode: false,
      setMultiMode: vi.fn(),
      busy: false,
      load: vi.fn(),
      onClose: vi.fn(),
      category: "DATASETS",
    };

    it("renders all toolbar buttons", () => {
      render(<FileToolbar {...defaultProps} />);
      expect(screen.getByRole("button", { name: /^Open$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Rename file/i })).toBeInTheDocument();
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
      expect(screen.getByRole("button", { name: /Rename file/i })).toBeDisabled();
    });

    it("shows multi-select mode pill when active", () => {
      render(<FileToolbar {...defaultProps} multiMode={true} />);
      expect(
        screen.getByRole("button", { name: /selecting multiple files/i })
      ).toBeInTheDocument();
    });

    it("does not show close button when onClose is not provided", () => {
      render(<FileToolbar {...defaultProps} onClose={null} />);
      expect(screen.queryByRole("button", { name: /^Close$/i })).not.toBeInTheDocument();
    });

    it("calls load when refresh button is clicked", () => {
      const load = vi.fn();
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
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
          busy={false}
        />
      );
      expect(screen.getByText(/Delete 1 file?/i)).toBeInTheDocument();
    });

    it("does not render when show is false", () => {
      render(
        <DeleteConfirmation
          show={false}
          selectedCount={1}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
          busy={false}
        />
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("pluralizes file count correctly", () => {
      render(
        <DeleteConfirmation
          show={true}
          selectedCount={3}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
          busy={false}
        />
      );
      expect(screen.getByText(/Delete 3 files?/i)).toBeInTheDocument();
    });

    it("calls onConfirm when Delete button is clicked", () => {
      const onConfirm = vi.fn();
      render(
        <DeleteConfirmation
          show={true}
          selectedCount={1}
          onCancel={vi.fn()}
          onConfirm={onConfirm}
          busy={false}
        />
      );
      const deleteButtons = screen.getAllByRole("button", { name: /^Delete$/i });
      fireEvent.click(deleteButtons[deleteButtons.length - 1]);
      expect(onConfirm).toHaveBeenCalled();
    });

    it("calls onCancel when Cancel button is clicked", () => {
      const onCancel = vi.fn();
      render(
        <DeleteConfirmation
          show={true}
          selectedCount={1}
          onCancel={onCancel}
          onConfirm={vi.fn()}
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
      onClose: vi.fn(),
      busy: false,
      selectedCount: 2,
      onApply: vi.fn(),
    };

    it("renders when show is true", () => {
      render(<CleanPanel {...defaultProps} />);
      expect(screen.getByText(/Data cleaning/i)).toBeInTheDocument();
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

    it("calls onApply when Apply button is clicked with at least one option enabled", () => {
      const onApply = vi.fn();
      render(<CleanPanel {...defaultProps} onApply={onApply} />);

      const switches = screen.getAllByRole("switch");
      fireEvent.click(switches[0]);

      const applyButton = screen.getByTitle(/apply cleaning/i);
      fireEvent.click(applyButton);
      expect(onApply).toHaveBeenCalled();
    });

    it("disables Apply button when no files are selected", () => {
      render(<CleanPanel {...defaultProps} selectedCount={0} />);
      const applyButton = screen.getByTitle(/apply cleaning/i);
      expect(applyButton).toBeDisabled();
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
      onRowMouseDown: vi.fn(),
      onRowMouseUp: vi.fn(),
      onRowMouseLeave: vi.fn(),
      longPressFired: { current: false },
      onRowClick: vi.fn(),
      onRowDoubleClick: vi.fn(),
      renamingName: null,
      renameInputRef: { current: null },
      renameDraft: "",
      setRenameDraft: vi.fn(),
      commitRename: vi.fn(),
      cancelRename: vi.fn(),
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
      expect(screen.getByText("file1.csv")).toBeInTheDocument();
    });

    it("shows rename input when file is being renamed", () => {
      render(
        <FileTable
          {...defaultProps}
          renamingKey="default::file1.csv"
          renameDraft="newname.csv"
        />
      );
      expect(screen.getByDisplayValue("newname.csv")).toBeInTheDocument();
    });

    it("calls onRowDoubleClick when row is double-clicked", () => {
      const onRowDoubleClick = vi.fn();
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
      const commitRename = vi.fn();
      render(
        <FileTable
          {...defaultProps}
          renamingKey="default::file1.csv"
          renameDraft=""
          commitRename={commitRename}
        />
      );
      const input = screen.getByDisplayValue("");
      fireEvent.keyDown(input, { key: "Enter" });
      expect(commitRename).toHaveBeenCalled();
    });

    it("calls cancelRename when Escape is pressed in rename input", () => {
      const cancelRename = vi.fn();
      render(
        <FileTable
          {...defaultProps}
          renamingKey="default::file1.csv"
          renameDraft=""
          cancelRename={cancelRename}
        />
      );
      const input = screen.getByDisplayValue("");
      fireEvent.keyDown(input, { key: "Escape" });
      expect(cancelRename).toHaveBeenCalled();
    });
  });

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
      expect(formatBytes(null)).toBe("0 B");
      expect(formatBytes(undefined)).toBe("—");
      expect(formatBytes(Infinity)).toBe("—");
      expect(formatBytes(1536)).toBe("1.50 KB");
      expect(formatBytes(10240)).toBe("10.0 KB");
      expect(formatBytes(102400)).toBe("100 KB");
    });

    it("handles formatDateTime correctly", () => {
      const { formatDateTime } = require("./fileUtils");
      expect(formatDateTime(0)).toBe("—");
      expect(formatDateTime(-1)).toBe("—");
      expect(formatDateTime(null)).toBe("—");
      expect(formatDateTime(undefined)).toBe("—");
      const validTime = Date.now();
      expect(formatDateTime(validTime)).not.toBe("—");
      expect(formatDateTime(validTime)).toContain("/");
      expect(formatDateTime(1609459200000)).not.toBe("—");
    });

    it("handles isFileNew correctly", () => {
      const { isFileNew } = require("./fileUtils");
      const newFile = { createdAtMs: Date.now() - 30000 };
      const oldFile = { createdAtMs: Date.now() - 120000 };
      const noTimeFile = {};

      expect(isFileNew(newFile, 60000)).toBe(true);
      expect(isFileNew(oldFile, 60000)).toBe(false);
      expect(isFileNew(noTimeFile, 60000)).toBe(false);
      expect(isFileNew({ createdAtMs: 0 }, 60000)).toBe(false);
      expect(isFileNew({ createdAtMs: null }, 60000)).toBe(false);
      expect(isFileNew(newFile, 20000)).toBe(false);
      expect(isFileNew(newFile, 40000)).toBe(true);
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
      render(<FileTypeIcon name="data.json" />);
      expect(screen.getByTitle("JSON")).toBeInTheDocument();
    });

    it("renders TXT icon for .txt files", () => {
      render(<FileTypeIcon name="readme.txt" />);
      expect(screen.getByTitle("TXT")).toBeInTheDocument();
    });

    it("renders XML icon for .xml files", () => {
      render(<FileTypeIcon name="config.xml" />);
      expect(screen.getByTitle("File")).toBeInTheDocument();
    });

    it("renders ZIP icon for .zip files", () => {
      render(<FileTypeIcon name="archive.zip" />);
      expect(screen.getByTitle("File")).toBeInTheDocument();
    });

    it("renders PDF icon for .pdf files", () => {
      render(<FileTypeIcon name="document.pdf" />);
      expect(screen.getByTitle("File")).toBeInTheDocument();
    });

    it("handles uppercase extensions", () => {
      render(<FileTypeIcon name="TEST.CSV" />);
      expect(screen.getByTitle("CSV")).toBeInTheDocument();
    });

    it("handles mixed case extensions", () => {
      render(<FileTypeIcon name="file.CsV" />);
      expect(screen.getByTitle("CSV")).toBeInTheDocument();
    });

    it("renders default icon for unknown extensions", () => {
      render(<FileTypeIcon name="file.unknown" />);
      expect(screen.getByTitle("File")).toBeInTheDocument();
    });
  });
});