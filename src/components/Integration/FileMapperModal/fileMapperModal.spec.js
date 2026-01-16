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
});
