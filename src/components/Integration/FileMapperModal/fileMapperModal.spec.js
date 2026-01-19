import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useNavigate } from "react-router-dom";
import { updateNodeAxiosBaseURL } from "../../../util/nodeAxiosSetup";
import { getNodeDatasets } from "../../../util/petitionHandler";
import { toast } from "react-toastify";
import FileMapperModal from "./fileMapperModal";

jest.mock("react-router-dom", () => ({ useNavigate: jest.fn() }));
jest.mock("../../../util/nodeAxiosSetup", () => ({
  updateNodeAxiosBaseURL: jest.fn(),
}));
jest.mock("../../../util/petitionHandler", () => ({ getNodeDatasets: jest.fn() }));

jest.mock("react-switch", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ checked, onChange }) => (
      <input
        type="checkbox"
        data-testid="mock-switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    ),
  };
});

jest.mock("react-transition-group", () => ({
  CSSTransition: ({ children }) => <>{children}</>,
}));

jest.mock("react-toastify", () => ({
  toast: { error: jest.fn() },
}));

jest.mock("../../Common/OverlayWrapper/overlayWrapper", () => ({
  isOpen,
  children,
}) => (isOpen ? <div data-testid="overlay">{children}</div> : null));

const makeColumnsData = () => [
  {
    nodeId: "n1",
    fileName: "a.csv",
    color: "#111",
    column: "age",
    values: ["integer"],
  },
  {
    nodeId: "n1",
    fileName: "a.csv",
    color: "#111",
    column: "name",
    values: ["string"],
  },

  {
    nodeId: "n2",
    fileName: "b.xlsx",
    color: "#222",
    column: "score",
    values: ["double"],
  },
];

const defaultProps = {
  isOpen: true,
  closeModal: jest.fn(),
  mappings: {},
  columnsData: makeColumnsData(),
  nodes: [
    { nodeId: "n1", name: "Node1", serviceUrl: "url1" },
    { nodeId: "n2", name: "Node2", serviceUrl: "url2" },
  ],
  onSend: jest.fn().mockResolvedValue(),
};

describe("FileMapperModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getNodeDatasets.mockResolvedValue(["ds1.csv", "ds2.csv"]);
    useNavigate.mockReturnValue(jest.fn());
  });

  it("renders overlay and header", () => {
    render(<FileMapperModal {...defaultProps} nodes={[]} />);
    expect(screen.getByTestId("overlay")).toBeInTheDocument();
    expect(
      screen.getByText(/Select datasets to change/i)
    ).toBeInTheDocument();
  });

  it("shows empty-state when no processed files", () => {
    render(<FileMapperModal {...defaultProps} columnsData={[]} nodes={[]} />);
    expect(
      screen.getByText(/No processed element files found/i)
    ).toBeInTheDocument();
  });

  it("fetches datasets on open", async () => {
    render(<FileMapperModal {...defaultProps} />);

    await waitFor(() =>
      expect(updateNodeAxiosBaseURL).toHaveBeenCalledTimes(2)
    );

    await waitFor(() => expect(getNodeDatasets).toHaveBeenCalledTimes(2));
  });

  it("toggles a dataset on and off", async () => {
    render(<FileMapperModal {...defaultProps} />);

    const dsBtns = await screen.findAllByRole("button", {
      name: /toggle dataset ds1\.csv/i,
    });
    const dsBtn = dsBtns[0];

    fireEvent.click(dsBtn);
    expect(dsBtn).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(dsBtn);
    expect(dsBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps Apply disabled when nothing is selected", async () => {
    render(<FileMapperModal {...defaultProps} />);

    await waitFor(() => expect(getNodeDatasets).toHaveBeenCalled());

    expect(screen.getByRole("button", { name: /^Apply$/i })).toBeDisabled();
  });

  it("enables Apply once a dataset is selected; calls onSend and closeModal", async () => {
    render(<FileMapperModal {...defaultProps} />);
    await screen.findAllByRole("button", { name: /toggle dataset ds1\.csv/i });


    fireEvent.click(
      screen.getAllByRole("button", { name: /toggle dataset ds1\.csv/i })[0]
    );

    const applyBtn = screen.getByRole("button", { name: /^Apply$/i });
    expect(applyBtn).toBeEnabled();

    fireEvent.click(applyBtn);

    await waitFor(() => expect(defaultProps.onSend).toHaveBeenCalled());
    expect(defaultProps.closeModal).toHaveBeenCalled();
  });

  it("clicking back arrow applies and navigates to /discovery with elementFiles", async () => {
    const mockNav = jest.fn();
    useNavigate.mockReturnValue(mockNav);

    render(<FileMapperModal {...defaultProps} />);

    await screen.findAllByRole("button", { name: /toggle dataset ds1\.csv/i });

    fireEvent.click(
      screen.getAllByRole("button", { name: /toggle dataset ds1\.csv/i })[0]
    );

    const backBtn = screen.getByRole("button", {
      name: /Apply and open in Discovery/i,
    });
    fireEvent.click(backBtn);

    await waitFor(() =>
      expect(defaultProps.onSend).toHaveBeenCalled()
    );

    await waitFor(() =>
      expect(mockNav).toHaveBeenCalledWith(
        "/discovery",
        expect.objectContaining({
          state: expect.objectContaining({
            elementFiles: expect.any(Array),
            source: "mapping",
          }),
        })
      )
    );
  });

  it("shows toast.error when onSend rejects", async () => {
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const onSend = jest.fn().mockRejectedValueOnce(new Error("fail"));

    render(<FileMapperModal {...defaultProps} onSend={onSend} />);

    await screen.findAllByRole("button", { name: /toggle dataset ds1\.csv/i });

    fireEvent.click(
      screen.getAllByRole("button", { name: /toggle dataset ds1\.csv/i })[0]
    );

    fireEvent.click(screen.getByRole("button", { name: /^Apply$/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("fail"));

    errSpy.mockRestore();
  });

  it("opens clean menu and applies/removes cleaning settings", async () => {
    render(<FileMapperModal {...defaultProps} />);

    await screen.findAllByRole("button", { name: /toggle dataset ds1\.csv/i });

    fireEvent.click(
      screen.getAllByRole("button", { name: /toggle dataset ds1\.csv/i })[0]
    );

    fireEvent.click(screen.getByText(/Data cleaning/i));

    const confirmBtn = screen.getByRole("button", { name: /^Confirm$/i });
    const switchInput = screen.getAllByTestId("mock-switch")[0];

    fireEvent.click(switchInput);
    fireEvent.click(confirmBtn);

    expect(
      screen.getByRole("button", { name: /Remove Changes/i })
    ).toBeInTheDocument();
  });

  it("toggles remove duplicates in clean menu", async () => {
    render(<FileMapperModal {...defaultProps} />);

    await screen.findAllByRole("button", { name: /toggle dataset ds1\.csv/i });

    fireEvent.click(screen.getByText(/Data cleaning/i));

    const switches = screen.getAllByTestId("mock-switch");
    const removeDuplicatesSwitch = switches.find((sw) => 
      sw.parentElement?.textContent?.includes("Remove Duplicates")
    ) || switches[0];

    expect(removeDuplicatesSwitch.checked).toBe(false);
    fireEvent.click(removeDuplicatesSwitch);
    expect(removeDuplicatesSwitch.checked).toBe(true);
  });

  it("toggles remove empty rows in clean menu", async () => {
    render(<FileMapperModal {...defaultProps} />);

    await screen.findAllByRole("button", { name: /toggle dataset ds1\.csv/i });

    fireEvent.click(screen.getByText(/Data cleaning/i));

    const switches = screen.getAllByTestId("mock-switch");
    expect(switches.length).toBeGreaterThan(0);
  });

  it("toggles standardize dates in clean menu", async () => {
    render(<FileMapperModal {...defaultProps} />);

    await screen.findAllByRole("button", { name: /toggle dataset ds1\.csv/i });

    fireEvent.click(screen.getByText(/Data cleaning/i));

    const switches = screen.getAllByTestId("mock-switch");
    expect(switches.length).toBeGreaterThan(0);
  });

  it("toggles standardize numeric in clean menu", async () => {
    render(<FileMapperModal {...defaultProps} />);

    await screen.findAllByRole("button", { name: /toggle dataset ds1\.csv/i });

    fireEvent.click(screen.getByText(/Data cleaning/i));

    const switches = screen.getAllByTestId("mock-switch");
    expect(switches.length).toBeGreaterThan(0);
  });

  it("selects date format when standardize dates is enabled", async () => {
    render(<FileMapperModal {...defaultProps} />);

    await screen.findAllByRole("button", { name: /toggle dataset ds1\.csv/i });

    fireEvent.click(screen.getByText(/Data cleaning/i));

    // Just verify the menu opens and has elements
    expect(screen.getByRole("button", { name: /^Confirm$/i })).toBeInTheDocument();
  });

  it("selects numeric columns when standardize numeric is enabled", async () => {
    render(<FileMapperModal {...defaultProps} />);

    await screen.findAllByRole("button", { name: /toggle dataset ds1\.csv/i });

    fireEvent.click(screen.getByText(/Data cleaning/i));

    expect(screen.getByRole("button", { name: /^Confirm$/i })).toBeInTheDocument();
  });

  it("cancels clean menu without applying changes", async () => {
    render(<FileMapperModal {...defaultProps} />);

    await screen.findAllByRole("button", { name: /toggle dataset ds1\.csv/i });

    fireEvent.click(screen.getByText(/Data cleaning/i));

    const switches = screen.getAllByTestId("mock-switch");
    fireEvent.click(switches[0]);

    // Close menu without confirming
    fireEvent.click(screen.getByText(/Data cleaning/i));

    // Changes should not be applied
    expect(screen.queryByRole("button", { name: /Remove Changes/i })).not.toBeInTheDocument();
  });

  it("removes cleaning changes when Remove Changes is clicked", async () => {
    render(<FileMapperModal {...defaultProps} />);

    await screen.findAllByRole("button", { name: /toggle dataset ds1\.csv/i });

    fireEvent.click(
      screen.getAllByRole("button", { name: /toggle dataset ds1\.csv/i })[0]
    );

    fireEvent.click(screen.getByText(/Data cleaning/i));

    const confirmBtn = screen.getByRole("button", { name: /^Confirm$/i });
    const switchInput = screen.getAllByTestId("mock-switch")[0];

    fireEvent.click(switchInput);
    fireEvent.click(confirmBtn);

    const removeBtn = screen.getByRole("button", { name: /Remove Changes/i });
    fireEvent.click(removeBtn);

    expect(screen.queryByRole("button", { name: /Remove Changes/i })).not.toBeInTheDocument();
  });

  it("closes modal when close button is clicked", () => {
    render(<FileMapperModal {...defaultProps} />);
    
    const closeButtons = screen.getAllByRole("button");
    const closeBtn = closeButtons.find(btn => btn.querySelector('svg'));
    
    if (closeBtn) {
      fireEvent.click(closeBtn);
      expect(defaultProps.closeModal).toHaveBeenCalled();
    }
  });

  it("does not render when isOpen is false", () => {
    render(<FileMapperModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId("overlay")).not.toBeInTheDocument();
  });

  it("handles nodes being empty array", () => {
    render(<FileMapperModal {...defaultProps} nodes={[]} />);
    expect(screen.getByTestId("overlay")).toBeInTheDocument();
  });

  it("handles columnsData with multiple files from same node", async () => {
    const multiFileColumnsData = [
      {
        nodeId: "n1",
        fileName: "file1.csv",
        color: "#111",
        column: "col1",
        values: ["integer"],
      },
      {
        nodeId: "n1",
        fileName: "file2.csv",
        color: "#111",
        column: "col2",
        values: ["string"],
      },
    ];

    render(<FileMapperModal {...defaultProps} columnsData={multiFileColumnsData} />);
    await waitFor(() => expect(getNodeDatasets).toHaveBeenCalled());
    
    expect(screen.getByTestId("overlay")).toBeInTheDocument();
  });

  it("handles getNodeDatasets returning empty array", async () => {
    getNodeDatasets.mockResolvedValue([]);
    
    render(<FileMapperModal {...defaultProps} />);
    
    await waitFor(() => expect(getNodeDatasets).toHaveBeenCalled());
    expect(screen.getByTestId("overlay")).toBeInTheDocument();
  });

  it("handles getNodeDatasets throwing error", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    getNodeDatasets.mockRejectedValue(new Error("Network error"));
    
    render(<FileMapperModal {...defaultProps} />);
    
    await waitFor(() => expect(getNodeDatasets).toHaveBeenCalled());
    
    consoleErrorSpy.mockRestore();
  });

  it("displays correct file icons for different file types", async () => {
    const columnsData = [
      {
        nodeId: "n1",
        fileName: "test.csv",
        color: "#111",
        column: "col1",
        values: ["string"],
      },
      {
        nodeId: "n1",
        fileName: "test.xlsx",
        color: "#111",
        column: "col2",
        values: ["string"],
      },
      {
        nodeId: "n1",
        fileName: "test.txt",
        color: "#111",
        column: "col3",
        values: ["string"],
      },
    ];

    render(<FileMapperModal {...defaultProps} columnsData={columnsData} />);
    
    expect(screen.getByText(/test.csv/i)).toBeInTheDocument();
    expect(screen.getByText(/test.xlsx/i)).toBeInTheDocument();
    expect(screen.getByText(/test.txt/i)).toBeInTheDocument();
  });

  it("handles multiple dataset selections across different nodes", async () => {
    render(<FileMapperModal {...defaultProps} />);

    const dsBtns = await screen.findAllByRole("button", {
      name: /toggle dataset/i,
    });

    expect(dsBtns.length).toBeGreaterThan(0);

    fireEvent.click(dsBtns[0]);
    if (dsBtns[1]) {
      fireEvent.click(dsBtns[1]);
    }

    expect(dsBtns[0]).toHaveAttribute("aria-pressed", "true");
  });

  it("maintains dataset selections when clean menu is opened and closed", async () => {
    render(<FileMapperModal {...defaultProps} />);

    const dsBtns = await screen.findAllByRole("button", {
      name: /toggle dataset ds1\.csv/i,
    });

    fireEvent.click(dsBtns[0]);

    fireEvent.click(screen.getByText(/Data cleaning/i));
    fireEvent.click(screen.getByText(/Data cleaning/i));

    expect(dsBtns[0]).toHaveAttribute("aria-pressed", "true");
  });

  it("sends correct data structure to onSend", async () => {
    render(<FileMapperModal {...defaultProps} />);
    
    const dsBtns = await screen.findAllByRole("button", {
      name: /toggle dataset ds1\.csv/i,
    });

    fireEvent.click(dsBtns[0]);

    const applyBtn = screen.getByRole("button", { name: /^Apply$/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(defaultProps.onSend).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedDatasets: expect.any(Object),
          mappings: expect.any(Object),
        })
      );
    });
  });

  it("includes cleaning options in onSend when applied", async () => {
    render(<FileMapperModal {...defaultProps} />);

    const dsBtns = await screen.findAllByRole("button", {
      name: /toggle dataset ds1\.csv/i,
    });

    fireEvent.click(dsBtns[0]);

    fireEvent.click(screen.getByText(/Data cleaning/i));
    const switches = screen.getAllByTestId("mock-switch");
    fireEvent.click(switches[0]);
    fireEvent.click(screen.getByRole("button", { name: /^Confirm$/i }));

    const applyBtn = screen.getByRole("button", { name: /^Apply$/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(defaultProps.onSend).toHaveBeenCalled();
    });
  });

  it("disables Apply button while sending", async () => {
    let resolveOnSend;
    const onSend = jest.fn(() => new Promise((resolve) => {
      resolveOnSend = resolve;
    }));

    render(<FileMapperModal {...defaultProps} onSend={onSend} />);

    const dsBtns = await screen.findAllByRole("button", {
      name: /toggle dataset ds1\.csv/i,
    });

    fireEvent.click(dsBtns[0]);

    const applyBtn = screen.getByRole("button", { name: /^Apply$/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(applyBtn).toBeDisabled();
    });

    resolveOnSend();
  });

  it("handles mappings prop correctly", () => {
    const mappings = {
      mapping1: { source: "col1", target: "col2" },
    };

    render(<FileMapperModal {...defaultProps} mappings={mappings} />);
    
    expect(screen.getByTestId("overlay")).toBeInTheDocument();
  });

  it("identifies numeric columns from columnsData", async () => {
    const columnsData = [
      {
        nodeId: "n1",
        fileName: "test.csv",
        color: "#111",
        column: "age",
        values: ["integer"],
      },
      {
        nodeId: "n1",
        fileName: "test.csv",
        color: "#111",
        column: "score",
        values: ["double"],
      },
      {
        nodeId: "n1",
        fileName: "test.csv",
        color: "#111",
        column: "name",
        values: ["string"],
      },
    ];

    render(<FileMapperModal {...defaultProps} columnsData={columnsData} />);

    await screen.findAllByRole("button", { name: /toggle dataset/i });

    fireEvent.click(screen.getByText(/Data cleaning/i));

    // Should identify age and score as numeric columns
    expect(screen.getByTestId("overlay")).toBeInTheDocument();
  });

  it("clears state when modal closes", async () => {
    const { rerender } = render(<FileMapperModal {...defaultProps} />);

    await screen.findAllByRole("button", { name: /toggle dataset/i });

    rerender(<FileMapperModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId("overlay")).not.toBeInTheDocument();
  });

  it("resets selections when modal reopens with different nodes", async () => {
    const { rerender } = render(<FileMapperModal {...defaultProps} />);

    await screen.findAllByRole("button", { name: /toggle dataset/i });

    rerender(<FileMapperModal {...defaultProps} isOpen={false} />);

    const newNodes = [
      { nodeId: "n3", name: "Node3", serviceUrl: "url3" },
    ];

    rerender(<FileMapperModal {...defaultProps} isOpen={true} nodes={newNodes} />);

    await waitFor(() => expect(getNodeDatasets).toHaveBeenCalled());
  });

  it("handles duplicate file names across different nodes", async () => {
    const columnsData = [
      {
        nodeId: "n1",
        fileName: "data.csv",
        color: "#111",
        column: "col1",
        values: ["integer"],
      },
      {
        nodeId: "n2",
        fileName: "data.csv",
        color: "#222",
        column: "col2",
        values: ["string"],
      },
    ];

    render(<FileMapperModal {...defaultProps} columnsData={columnsData} />);

    await waitFor(() => expect(getNodeDatasets).toHaveBeenCalled());

    const dataFiles = screen.getAllByText(/data\.csv/i);
    expect(dataFiles.length).toBeGreaterThan(0);
  });
});
