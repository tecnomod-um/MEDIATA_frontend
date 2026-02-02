import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Projects from "./projects";
import * as petitionHandler from "../../util/petitionHandler";


let lastProjectPickerProps = null;

jest.mock("./projects.module.css", () => new Proxy({}, { get: (_, k) => String(k) }), {
  virtual: true,
});

jest.mock("../../components/Common/FilePicker/projectPicker", () => {
  const React = require("react");
  return function MockProjectPicker(props) {
    lastProjectPickerProps = props;
    const first = (props.projects || [])[0];
    return (
      <div data-testid="project-picker">
        <div data-testid="modal-title">{props.modalTitle}</div>
        <div data-testid="project-name">{first?.name || "none"}</div>
        <button type="button" onClick={() => props.onSelectProject?.(first)}>
          Select First Project
        </button>
      </div>
    );
  };
});

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock("../../util/petitionHandler");

describe("<Projects />", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastProjectPickerProps = null;
    petitionHandler.getProjectList = jest.fn().mockResolvedValue([
      { id: "1111-1111-1111-1111", name: "STRATIF-AI" }
    ]);
  });

  it("renders ProjectPicker with one project and navigates to /nodes on selection", async () => {
    render(<Projects />);

    // Wait for the project name to appear
    await waitFor(() => {
      expect(screen.getByTestId("project-name")).toHaveTextContent("STRATIF-AI");
    });

    expect(screen.getByTestId("project-picker")).toBeInTheDocument();
    expect(screen.getByTestId("modal-title")).toHaveTextContent(/select a project/i);
    expect(lastProjectPickerProps).toBeTruthy();
    expect(lastProjectPickerProps.projects).toHaveLength(1);
    expect(lastProjectPickerProps.projects[0]).toEqual(
      expect.objectContaining({ id: "1111-1111-1111-1111", name: "STRATIF-AI" })
    );

    fireEvent.click(screen.getByRole("button", { name: /select first project/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/nodes", {
      state: { projectId: "1111-1111-1111-1111" },
    });
  });
});
