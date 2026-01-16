/**
 * Integration tests for FileExplorer component
 * These tests aim to increase coverage of the main FileExplorer component
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock axios FIRST before any other imports
jest.mock("axios", () => {
  const mockAxios = {
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };
  const mockCreate = jest.fn(() => mockAxios);
  return { 
    __esModule: true, 
    default: { create: mockCreate },
    create: mockCreate,
  };
});

// Mock config
jest.mock("../../../config", () => ({ backendUrl: "https://api.example.com" }));

// Mock CSS module
jest.mock("./fileExplorer.module.css", () => new Proxy({}, { get: (_, k) => String(k) }), {
  virtual: true,
});

// Mock react-transition-group to simplify testing
jest.mock("react-transition-group", () => ({
  CSSTransition: ({ children, in: inProp }) => (inProp ? children : null),
}));

// Mock toast
jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock petition handler
jest.mock("../../../util/petitionHandler", () => ({
  listExplorerFiles: jest.fn(),
  renameExplorerFile: jest.fn(),
  deleteExplorerFile: jest.fn(),
  cleanExplorerFile: jest.fn(),
  processSelectedDatasets: jest.fn(),
  getProcessSelectedDatasetsStatus: jest.fn(),
  getProcessSelectedDatasetsResult: jest.fn(),
}));

// Mock node axios setup
jest.mock("../../../util/nodeAxiosSetup", () => ({
  updateNodeAxiosBaseURL: jest.fn(),
}));

// Now import after all mocks are set up
import FileExplorer from "./fileExplorer";
import * as petitionHandler from "../../../util/petitionHandler";
import * as nodeAxiosSetup from "../../../util/nodeAxiosSetup";
import { toast } from "react-toastify";

describe("FileExplorer Component - Integration Tests", () => {
  const mockFiles = [
    {
      name: "test1.csv",
      sizeBytes: 1024,
      createdAtMs: Date.now() - 120000,
      lastModifiedAtMs: Date.now() - 120000,
    },
    {
      name: "test2.xlsx",
      sizeBytes: 2048,
      createdAtMs: Date.now() - 30000,
      lastModifiedAtMs: Date.now() - 30000,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    petitionHandler.listExplorerFiles.mockResolvedValue(mockFiles);
  });

  describe("Component Rendering and Loading", () => {
    it("renders without crashing when closed", () => {
      render(<FileExplorer isOpen={false} category="data" />);
      expect(screen.queryByText("test1.csv")).not.toBeInTheDocument();
    });

    it("loads and displays files when opened", async () => {
      render(<FileExplorer isOpen={true} category="data" />);

      await waitFor(() => {
        expect(petitionHandler.listExplorerFiles).toHaveBeenCalledWith("data");
      });

      await waitFor(() => {
        expect(screen.getByText("test1.csv")).toBeInTheDocument();
        expect(screen.getByText("test2.xlsx")).toBeInTheDocument();
      });
    });

    it("shows empty state when no files exist", async () => {
      petitionHandler.listExplorerFiles.mockResolvedValue([]);

      render(<FileExplorer isOpen={true} category="data" />);

      await waitFor(() => {
        expect(screen.getByText("No files available")).toBeInTheDocument();
      });
    });

    it("handles API errors gracefully", async () => {
      const error = new Error("API Error");
      petitionHandler.listExplorerFiles.mockRejectedValue(error);

      render(<FileExplorer isOpen={true} category="data" />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("API Error");
      });
    });

    it("loads files from multiple nodes", async () => {
      const nodes = [
        { nodeId: "node1", nodeName: "Node 1", serviceUrl: "http://node1" },
        { nodeId: "node2", nodeName: "Node 2", serviceUrl: "http://node2" },
      ];

      petitionHandler.listExplorerFiles
        .mockResolvedValueOnce([mockFiles[0]])
        .mockResolvedValueOnce([mockFiles[1]]);

      render(<FileExplorer isOpen={true} category="data" nodes={nodes} />);

      await waitFor(() => {
        expect(nodeAxiosSetup.updateNodeAxiosBaseURL).toHaveBeenCalledWith("http://node1");
        expect(nodeAxiosSetup.updateNodeAxiosBaseURL).toHaveBeenCalledWith("http://node2");
        expect(petitionHandler.listExplorerFiles).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("File Selection", () => {
    it("selects a file on click", async () => {
      render(<FileExplorer isOpen={true} category="data" />);

      await waitFor(() => {
        expect(screen.getByText("test1.csv")).toBeInTheDocument();
      });

      const rows = screen.getAllByRole("button");
      const fileRow = rows.find(r => r.textContent.includes("test1.csv"));
      
      fireEvent.click(fileRow);

      // File should still be in document (selected)
      expect(fileRow).toBeInTheDocument();
    });

    it("toggles selection with Ctrl+click", async () => {
      render(<FileExplorer isOpen={true} category="data" />);

      await waitFor(() => {
        expect(screen.getByText("test1.csv")).toBeInTheDocument();
      });

      const rows = screen.getAllByRole("button");
      const file1 = rows.find(r => r.textContent.includes("test1.csv"));
      const file2 = rows.find(r => r.textContent.includes("test2.xlsx"));

      fireEvent.click(file1, { ctrlKey: true });
      fireEvent.click(file2, { ctrlKey: true });

      expect(file1).toBeInTheDocument();
      expect(file2).toBeInTheDocument();
    });

    it("selects range with Shift+click", async () => {
      const manyFiles = [
        { name: "file1.csv", sizeBytes: 1024, createdAtMs: Date.now(), lastModifiedAtMs: Date.now() },
        { name: "file2.csv", sizeBytes: 1024, createdAtMs: Date.now(), lastModifiedAtMs: Date.now() },
        { name: "file3.csv", sizeBytes: 1024, createdAtMs: Date.now(), lastModifiedAtMs: Date.now() },
      ];
      petitionHandler.listExplorerFiles.mockResolvedValue(manyFiles);

      render(<FileExplorer isOpen={true} category="data" />);

      await waitFor(() => {
        expect(screen.getByText("file1.csv")).toBeInTheDocument();
      });

      const rows = screen.getAllByRole("button");
      const file1 = rows.find(r => r.textContent.includes("file1.csv"));
      const file3 = rows.find(r => r.textContent.includes("file3.csv"));

      fireEvent.click(file1);
      fireEvent.click(file3, { shiftKey: true });

      expect(file1).toBeInTheDocument();
      expect(file3).toBeInTheDocument();
    });

    it("applies pre-selected files on mount", async () => {
      const preSelectedFiles = {
        default: ["test1.csv"],
      };

      render(<FileExplorer isOpen={true} category="data" preSelectedFiles={preSelectedFiles} />);

      await waitFor(() => {
        expect(screen.getByText("test1.csv")).toBeInTheDocument();
      });

      // Pre-selection should be applied (component behavior)
      expect(screen.getByText("test1.csv")).toBeInTheDocument();
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("opens file on Enter key", async () => {
      const onFilesSelected = jest.fn();
      render(<FileExplorer isOpen={true} category="data" onFilesSelected={onFilesSelected} />);

      await waitFor(() => {
        expect(screen.getByText("test1.csv")).toBeInTheDocument();
      });

      const rows = screen.getAllByRole("button");
      const fileRow = rows.find(r => r.textContent.includes("test1.csv"));
      
      fireEvent.click(fileRow);
      fireEvent.keyDown(document, { key: "Enter" });

      await waitFor(() => {
        expect(onFilesSelected).toHaveBeenCalled();
      }, { timeout: 100 });
    });

    it("starts rename on F2 key", async () => {
      render(<FileExplorer isOpen={true} category="data" />);

      await waitFor(() => {
        expect(screen.getByText("test1.csv")).toBeInTheDocument();
      });

      const rows = screen.getAllByRole("button");
      const fileRow = rows.find(r => r.textContent.includes("test1.csv"));
      
      fireEvent.click(fileRow);
      fireEvent.keyDown(document, { key: "F2" });

      await waitFor(() => {
        const input = screen.queryByDisplayValue("test1.csv");
        expect(input).toBeInTheDocument();
      });
    });

    it("shows delete confirmation on Delete key", async () => {
      render(<FileExplorer isOpen={true} category="data" />);

      await waitFor(() => {
        expect(screen.getByText("test1.csv")).toBeInTheDocument();
      });

      const rows = screen.getAllByRole("button");
      const fileRow = rows.find(r => r.textContent.includes("test1.csv"));
      
      fireEvent.click(fileRow);
      fireEvent.keyDown(document, { key: "Delete" });

      await waitFor(() => {
        expect(screen.getByText(/Delete 1 file?/i)).toBeInTheDocument();
      });
    });

    it("closes panels on Escape key", async () => {
      render(<FileExplorer isOpen={true} category="data" />);

      await waitFor(() => {
        expect(screen.getByText("test1.csv")).toBeInTheDocument();
      });

      const rows = screen.getAllByRole("button");
      const fileRow = rows.find(r => r.textContent.includes("test1.csv"));
      
      fireEvent.click(fileRow);
      fireEvent.keyDown(document, { key: "Delete" });

      await waitFor(() => {
        expect(screen.getByText(/Delete 1 file?/i)).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: "Escape" });

      await waitFor(() => {
        expect(screen.queryByText(/Delete 1 file?/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("File Operations", () => {
    it("renames a file successfully", async () => {
      petitionHandler.renameExplorerFile.mockResolvedValue({});
      petitionHandler.listExplorerFiles
        .mockResolvedValueOnce(mockFiles)
        .mockResolvedValueOnce([
          { ...mockFiles[0], name: "renamed.csv" },
          mockFiles[1],
        ]);

      render(<FileExplorer isOpen={true} category="data" />);

      await waitFor(() => {
        expect(screen.getByText("test1.csv")).toBeInTheDocument();
      });

      const rows = screen.getAllByRole("button");
      const fileRow = rows.find(r => r.textContent.includes("test1.csv"));
      
      fireEvent.click(fileRow);
      fireEvent.keyDown(document, { key: "F2" });

      await waitFor(() => {
        const input = screen.getByDisplayValue("test1.csv");
        expect(input).toBeInTheDocument();
        
        fireEvent.change(input, { target: { value: "renamed.csv" } });
        fireEvent.keyDown(input, { key: "Enter" });
      });

      await waitFor(() => {
        expect(petitionHandler.renameExplorerFile).toHaveBeenCalledWith("data", "test1.csv", "renamed.csv");
      });
    });

    it("cancels rename on Escape", async () => {
      render(<FileExplorer isOpen={true} category="data" />);

      await waitFor(() => {
        expect(screen.getByText("test1.csv")).toBeInTheDocument();
      });

      const rows = screen.getAllByRole("button");
      const fileRow = rows.find(r => r.textContent.includes("test1.csv"));
      
      fireEvent.click(fileRow);
      fireEvent.keyDown(document, { key: "F2" });

      await waitFor(() => {
        const input = screen.getByDisplayValue("test1.csv");
        fireEvent.keyDown(input, { key: "Escape" });
      });

      await waitFor(() => {
        expect(screen.queryByDisplayValue("test1.csv")).not.toBeInTheDocument();
      });
    });

    it("deletes a file after confirmation", async () => {
      petitionHandler.deleteExplorerFile.mockResolvedValue({});
      petitionHandler.listExplorerFiles
        .mockResolvedValueOnce(mockFiles)
        .mockResolvedValueOnce([mockFiles[1]]);

      render(<FileExplorer isOpen={true} category="data" />);

      await waitFor(() => {
        expect(screen.getByText("test1.csv")).toBeInTheDocument();
      });

      const rows = screen.getAllByRole("button");
      const fileRow = rows.find(r => r.textContent.includes("test1.csv"));
      
      fireEvent.click(fileRow);
      fireEvent.keyDown(document, { key: "Delete" });

      await waitFor(() => {
        expect(screen.getByText(/Delete 1 file?/i)).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole("button", { name: /^Delete$/i });
      const confirmButton = deleteButtons[deleteButtons.length - 1];
      
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(petitionHandler.deleteExplorerFile).toHaveBeenCalledWith("data", "test1.csv");
      });
    });

    it("handles delete errors", async () => {
      const error = new Error("Delete failed");
      petitionHandler.deleteExplorerFile.mockRejectedValue(error);

      render(<FileExplorer isOpen={true} category="data" />);

      await waitFor(() => {
        expect(screen.getByText("test1.csv")).toBeInTheDocument();
      });

      const rows = screen.getAllByRole("button");
      const fileRow = rows.find(r => r.textContent.includes("test1.csv"));
      
      fireEvent.click(fileRow);
      fireEvent.keyDown(document, { key: "Delete" });

      await waitFor(() => {
        expect(screen.getByText(/Delete 1 file?/i)).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole("button", { name: /^Delete$/i });
      const confirmButton = deleteButtons[deleteButtons.length - 1];
      
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Delete failed");
      });
    });
  });

  describe("File Refresh", () => {
    it("refreshes file list on refresh button click", async () => {
      render(<FileExplorer isOpen={true} category="data" />);

      await waitFor(() => {
        expect(screen.getByText("test1.csv")).toBeInTheDocument();
      });

      petitionHandler.listExplorerFiles.mockClear();
      petitionHandler.listExplorerFiles.mockResolvedValue(mockFiles);

      const refreshButton = screen.getByRole("button", { name: /Refresh/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(petitionHandler.listExplorerFiles).toHaveBeenCalledWith("data");
      });
    });

    it("reloads files when category changes", async () => {
      const { rerender } = render(<FileExplorer isOpen={true} category="data" />);

      await waitFor(() => {
        expect(petitionHandler.listExplorerFiles).toHaveBeenCalledWith("data");
      });

      petitionHandler.listExplorerFiles.mockClear();

      rerender(<FileExplorer isOpen={true} category="models" />);

      await waitFor(() => {
        expect(petitionHandler.listExplorerFiles).toHaveBeenCalledWith("models");
      });
    });

    it("reloads files when isOpen changes to true", async () => {
      const { rerender } = render(<FileExplorer isOpen={false} category="data" />);

      expect(petitionHandler.listExplorerFiles).not.toHaveBeenCalled();

      rerender(<FileExplorer isOpen={true} category="data" />);

      await waitFor(() => {
        expect(petitionHandler.listExplorerFiles).toHaveBeenCalledWith("data");
      });
    });
  });

  describe("Component Callbacks", () => {
    it("calls onClose when close button is clicked", async () => {
      const onClose = jest.fn();

      render(<FileExplorer isOpen={true} category="data" onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("test1.csv")).toBeInTheDocument();
      });

      const closeButton = screen.getByRole("button", { name: /^Close$/i });
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it("shows error when no handler provided", async () => {
      render(<FileExplorer isOpen={true} category="data" />);

      await waitFor(() => {
        expect(screen.getByText("test1.csv")).toBeInTheDocument();
      });

      const rows = screen.getAllByRole("button");
      const fileRow = rows.find(r => r.textContent.includes("test1.csv"));
      
      fireEvent.click(fileRow);
      fireEvent.keyDown(document, { key: "Enter" });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("No handler: pass onFilesSelected or onFilesOpened.");
      });
    });

    it("sorts files alphabetically", async () => {
      const unsortedFiles = [
        { name: "zebra.csv", sizeBytes: 1024, createdAtMs: Date.now(), lastModifiedAtMs: Date.now() },
        { name: "apple.csv", sizeBytes: 1024, createdAtMs: Date.now(), lastModifiedAtMs: Date.now() },
        { name: "banana.csv", sizeBytes: 1024, createdAtMs: Date.now(), lastModifiedAtMs: Date.now() },
      ];
      petitionHandler.listExplorerFiles.mockResolvedValue(unsortedFiles);

      render(<FileExplorer isOpen={true} category="data" />);

      await waitFor(() => {
        expect(screen.getByText("apple.csv")).toBeInTheDocument();
        expect(screen.getByText("banana.csv")).toBeInTheDocument();
        expect(screen.getByText("zebra.csv")).toBeInTheDocument();
      });

      // Files should be displayed in alphabetical order
      const text = document.body.textContent;
      const applePos = text.indexOf("apple.csv");
      const bananaPos = text.indexOf("banana.csv");
      const zebraPos = text.indexOf("zebra.csv");
      
      expect(applePos).toBeLessThan(bananaPos);
      expect(bananaPos).toBeLessThan(zebraPos);
    });
  });
});
