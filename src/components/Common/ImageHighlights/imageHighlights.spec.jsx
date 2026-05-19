import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import ImageHighlights from "./imageHighlights";

vi.mock("./imageHighlights.module.css", () => ({
  __esModule: true,
  default: {
    highlightsContainer: "highlightsContainer",
    imageStage: "imageStage",
    baseImage: "baseImage",
    highlightBox: "highlightBox",
    stepButtons: "stepButtons",
    stepButton: "stepButton",
    activeStepButton: "activeStepButton",
    stepButtonLabel: "stepButtonLabel",
    stepTextContainer: "stepTextContainer",
    stepText: "stepText",
  },
}));

vi.mock("../../../hooks/useScrollFade", () => ({
  __esModule: true,
  default: () => ({
    ref: { current: null },
    style: { opacity: 1 },
  }),
}));

describe("<ImageHighlights />", () => {
  const steps = [
    {
      title: "Overview",
      description: "Overall view of the interface.",
    },
    {
      title: "Sidebar",
      description: "Sidebar controls.",
      highlight: { top: 10, left: 5, width: 18, height: 80, color: "#ff6347" },
    },
    {
      title: "Workspace",
      description: "Main work area.",
      highlight: { top: 12, left: 28, width: 60, height: 72, color: "#32cd32" },
    },
  ];

  it("renders the image, visible step text, and one button per step", () => {
    render(
      <ImageHighlights
        imageSrc="example.jpg"
        imageAlt="Example interface"
        steps={steps}
        label="Example walkthrough"
      />
    );

    expect(screen.getByRole("img", { name: /example interface/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /example walkthrough/i })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: /highlight description/i })).toHaveTextContent(
      /overall view of the interface/i
    );
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /show sidebar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show workspace/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /show overview/i })).not.toBeInTheDocument();
  });

  it("moves the highlight box when a step button is clicked", () => {
    render(
      <ImageHighlights
        imageSrc="example.jpg"
        imageAlt="Example interface"
        steps={steps}
      />
    );

    expect(screen.queryByTestId("highlight-box")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show sidebar/i }));

    const highlight = screen.getByTestId("highlight-box");
    expect(highlight).toBeInTheDocument();
    expect(highlight).toHaveStyle({
      top: "10%",
      left: "5%",
      width: "18%",
      height: "80%",
      "--highlight-accent": "#ff6347",
    });
    expect(screen.getByRole("status", { name: /highlight description/i })).toHaveTextContent(
      /sidebar controls/i
    );
  });

  it("returns to overview when the image area is clicked", () => {
    render(
      <ImageHighlights
        imageSrc="example.jpg"
        imageAlt="Example interface"
        steps={steps}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /show workspace/i }));
    expect(screen.getByRole("status", { name: /highlight description/i })).toHaveTextContent(
      /main work area/i
    );

    fireEvent.click(screen.getByRole("region", { name: /highlighted interface walkthrough/i }));
    expect(screen.getByRole("status", { name: /highlight description/i })).toHaveTextContent(
      /overall view of the interface/i
    );
    expect(screen.queryByTestId("highlight-box")).not.toBeInTheDocument();
  });

  it("returns to overview when clicking the active step button again", () => {
    render(
      <ImageHighlights
        imageSrc="example.jpg"
        imageAlt="Example interface"
        steps={steps}
      />
    );

    const sidebarButton = screen.getByRole("button", { name: /show sidebar/i });

    fireEvent.click(sidebarButton);
    expect(screen.getByRole("status", { name: /highlight description/i })).toHaveTextContent(
      /sidebar controls/i
    );
    expect(screen.getByTestId("highlight-box")).toBeInTheDocument();

    fireEvent.click(sidebarButton);
    expect(screen.getByRole("status", { name: /highlight description/i })).toHaveTextContent(
      /overall view of the interface/i
    );
    expect(screen.queryByTestId("highlight-box")).not.toBeInTheDocument();
  });

  it("returns to overview when clicking outside the component", () => {
    render(
      <div>
        <button type="button">Outside</button>
        <ImageHighlights
          imageSrc="example.jpg"
          imageAlt="Example interface"
          steps={steps}
        />
      </div>
    );

    fireEvent.click(screen.getByRole("button", { name: /show sidebar/i }));
    expect(screen.getByTestId("highlight-box")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("button", { name: /outside/i }));
    expect(screen.getByRole("status", { name: /highlight description/i })).toHaveTextContent(
      /overall view of the interface/i
    );
    expect(screen.queryByTestId("highlight-box")).not.toBeInTheDocument();
  });
});
