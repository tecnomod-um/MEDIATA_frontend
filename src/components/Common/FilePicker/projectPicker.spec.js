import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProjectPicker from "./projectPicker";

jest.mock("./filePicker.module.css", () => new Proxy({}, { get: (_, k) => String(k) }), {
  virtual: true,
});

jest.mock("react-transition-group", () => ({
  CSSTransition: ({ children, in: inProp, onEnter, onEntered }) => {
    if (inProp) {
      onEnter?.();
      onEntered?.();
      return <>{children}</>;
    }
    return null;
  },
}));

describe("<ProjectPicker />", () => {
  beforeEach(() => {
    jest.useFakeTimers();

    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return 200;
      },
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    delete HTMLElement.prototype.scrollHeight;
  });

  it("renders title and shows empty-state when projects is empty", () => {
    render(
      <ProjectPicker
        projects={[]}
        modalTitle="Select a project"
        onSelectProject={jest.fn()}
      />
    );

    expect(screen.getByText(/select a project/i)).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(70);
    });

    expect(screen.getByText(/no projects available/i)).toBeInTheDocument();
  });

  it("renders project rows and calls onSelectProject when clicking a project", () => {
    const onSelectProject = jest.fn();
    const projects = [
      {
        id: "p1",
        name: "STRATIF-AI",
        description: "desc",
        membersCount: 15,
        nodesCount: 2,
        dcatCount: 3,
        lastAccess: "17-12-2025",
        imageUrl: "/ok.png",
        badge: "Active",
      },
    ];

    render(
      <ProjectPicker
        projects={projects}
        modalTitle="Select a project"
        onSelectProject={onSelectProject}
      />
    );

    act(() => {
      jest.advanceTimersByTime(70);
    });

    expect(screen.getByText("STRATIF-AI")).toBeInTheDocument();
    expect(screen.getByText(/users:\s*15/i)).toBeInTheDocument();
    expect(screen.getByText(/nodes:\s*2/i)).toBeInTheDocument();
    expect(screen.getByText(/dcat descriptions:\s*3/i)).toBeInTheDocument();
    expect(screen.getByText(/last accessed:\s*17-12-2025/i)).toBeInTheDocument();
    expect(screen.getByText(/active/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /stratif-ai/i }));
    expect(onSelectProject).toHaveBeenCalledTimes(1);
    expect(onSelectProject).toHaveBeenCalledWith(projects[0]);
  });

  it("falls back to initials when image fails to load", () => {
    const projects = [
      {
        id: "p1",
        name: "Stratif AI",
        membersCount: 0,
        nodesCount: 0,
        dcatCount: 0,
        imageUrl: "/broken.png",
      },
    ];

    render(<ProjectPicker projects={projects} onSelectProject={jest.fn()} />);

    act(() => {
      jest.advanceTimersByTime(70);
    });

    const img = screen.getByAltText(/stratif ai logo/i);
    expect(img).toBeInTheDocument();

    fireEvent.error(img);
    expect(screen.getByText("SA")).toBeInTheDocument();
  });

  it("shows badge when provided and omits it when not provided", () => {
    const projects = [
      {
        id: "p1",
        name: "Project One",
        badge: "Closed",
        membersCount: 1,
        nodesCount: 1,
        dcatCount: 1,
      },
      {
        id: "p2",
        name: "Project Two",
        membersCount: 1,
        nodesCount: 1,
        dcatCount: 1,
      },
    ];

    render(<ProjectPicker projects={projects} onSelectProject={jest.fn()} />);

    act(() => {
      jest.advanceTimersByTime(70);
    });

    expect(screen.getByText(/closed/i)).toBeInTheDocument();
    expect(screen.getAllByText(/closed/i)).toHaveLength(1);
  });
});
