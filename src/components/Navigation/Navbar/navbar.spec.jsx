import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import Navbar from "./navbar.jsx";
import CustomLink from "./customLink.jsx";
import { useAuth } from "../../../context/authContext.jsx";
import { useNode } from "../../../context/nodeContext.jsx";

const routerMocks = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseNavigate: vi.fn(),
  mockUseMatch: vi.fn(),
  mockUseResolvedPath: vi.fn(),
}));

vi.mock("react-router-dom", () => {
  const React = require("react");
  return {
    __esModule: true,
    Link: ({ to, children, ...props }) =>
      React.createElement("a", { href: to, ...props }, children),
    useNavigate: routerMocks.mockUseNavigate,
    useMatch: routerMocks.mockUseMatch,
    useResolvedPath: routerMocks.mockUseResolvedPath,
  };
});

vi.mock("../../../context/authContext.jsx", () => ({
  __esModule: true,
  useAuth: vi.fn(),
}));

vi.mock("../../../context/nodeContext.jsx", () => ({
  __esModule: true,
  useNode: vi.fn(),
}));

describe("CustomLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerMocks.mockUseNavigate.mockReturnValue(routerMocks.mockNavigate);
    routerMocks.mockUseResolvedPath.mockReturnValue({ pathname: "/current" });
    routerMocks.mockUseMatch.mockReturnValue(false);
  });

  it("renders its children inside an <a> with correct href", () => {
    render(<CustomLink to="/foo">Bar</CustomLink>);
    const link = screen.getByRole("link", { name: "Bar" });
    expect(link).toHaveAttribute("href", "/foo");
  });

  it("adds aria-current when current path matches", () => {
    routerMocks.mockUseResolvedPath.mockReturnValue({ pathname: "/foo" });
    routerMocks.mockUseMatch.mockReturnValue(true);

    render(<CustomLink to="/foo">Active</CustomLink>);
    const link = screen.getByRole("link", { name: "Active" });
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("calls onClick when clicked, unless noToggle is true", () => {
    const onClick = vi.fn();

    const { rerender } = render(
      <CustomLink to="/x" onClick={onClick}>
        X
      </CustomLink>
    );
    fireEvent.click(screen.getByText("X"));
    expect(onClick).toHaveBeenCalledTimes(1);

    onClick.mockClear();

    rerender(
      <CustomLink to="/y" onClick={onClick} noToggle>
        Y
      </CustomLink>
    );
    fireEvent.click(screen.getByText("Y"));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Navbar", () => {
  let navigateMock;

  beforeEach(() => {
    vi.clearAllMocks();

    navigateMock = vi.fn();
    routerMocks.mockUseNavigate.mockReturnValue(navigateMock);
    routerMocks.mockUseResolvedPath.mockReturnValue({ pathname: "/" });
    routerMocks.mockUseMatch.mockReturnValue(false);

    useAuth.mockReturnValue({
      isAuthenticated: false,
      logout: vi.fn(),
      capabilities: { semanticAlignment: false, hl7fhir: false },
      capsLoaded: false,
    });

    useNode.mockReturnValue({ selectedNodes: null });
  });

  it("shows Home, Login, About when unauthenticated", () => {
    render(<Navbar />);

    expect(screen.getByRole("menuitem", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "About" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Projects" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Discovery" })).toBeNull();
  });

  it("toggles mobile menu when checkbox clicked", () => {
    render(<Navbar />);
    const checkbox = screen.getByRole("checkbox", { name: "Toggle menu" });

    expect(checkbox).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute("aria-expanded", "false");
  });

  it("renders extra nav items when authenticated and nodes selected", () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      logout: vi.fn(),
      capabilities: { semanticAlignment: true, hl7fhir: true },
      capsLoaded: true,
    });
    useNode.mockReturnValue({ selectedNodes: ["abc"] });

    render(<Navbar />);

    expect(screen.getByRole("link", { name: "Discovery" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Integration" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Semantic-Alignment" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "HL7 FHIR" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Toggle menu" }));

    expect(screen.getByRole("menuitem", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Projects" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Logout" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Tutorial" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "About" })).toBeInTheDocument();
  });

  it("calls logout + navigate on Logout click", () => {
    const logoutMock = vi.fn();

    useAuth.mockReturnValue({
      isAuthenticated: true,
      logout: logoutMock,
      capabilities: { semanticAlignment: true, hl7fhir: true },
      capsLoaded: true,
    });
    useNode.mockReturnValue({ selectedNodes: ["n1"] });

    render(<Navbar />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Toggle menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Logout" }));

    expect(logoutMock).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith("/");
  });

  it("renders the University logo with correct attrs", () => {
    render(<Navbar />);
    const logo = screen.getByAltText("University of Murcia logo");

    expect(logo).toHaveAttribute("src", expect.stringContaining("/umu_coat.svg"));
    expect(logo).toHaveAttribute("loading", "eager");
    expect(logo).toHaveAttribute("fetchpriority", "high");
  });

  it("includes FileSearchIcon inside Discovery desktop label", () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      logout: vi.fn(),
      capabilities: { semanticAlignment: true, hl7fhir: true },
      capsLoaded: true,
    });
    useNode.mockReturnValue({ selectedNodes: ["n1"] });

    render(<Navbar />);
    expect(screen.getByTitle("Dataset analysis and exploration")).toBeInTheDocument();
  });

  it("does not render extra nav items when authenticated but no nodes selected", () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      logout: vi.fn(),
      capabilities: { semanticAlignment: true, hl7fhir: true },
      capsLoaded: true,
    });
    useNode.mockReturnValue({ selectedNodes: null });

    render(<Navbar />);

    expect(screen.queryByRole("link", { name: "Discovery" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Integration" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Semantic-Alignment" })).toBeNull();
    expect(screen.queryByRole("link", { name: "HL7 FHIR" })).toBeNull();

    fireEvent.click(screen.getByRole("checkbox", { name: "Toggle menu" }));
    expect(screen.getByRole("menuitem", { name: "Projects" })).toBeInTheDocument();
  });

  it("closes mobile menu on window resize above 768px", () => {
    render(<Navbar />);
    const checkbox = screen.getByRole("checkbox", { name: "Toggle menu" });

    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute("aria-expanded", "true");

    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });

    fireEvent(window, new Event("resize"));
    expect(checkbox).toHaveAttribute("aria-expanded", "false");
  });

  it("only shows Discovery and Integration when capabilities are disabled", () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      logout: vi.fn(),
      capabilities: { semanticAlignment: false, hl7fhir: false },
      capsLoaded: true,
    });
    useNode.mockReturnValue({ selectedNodes: ["abc"] });

    render(<Navbar />);

    expect(screen.getByRole("link", { name: "Discovery" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Integration" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Semantic-Alignment" })).toBeNull();
    expect(screen.queryByRole("link", { name: "HL7 FHIR" })).toBeNull();
  });

  it("shows Semantic-Alignment when capability is enabled", () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      logout: vi.fn(),
      capabilities: { semanticAlignment: true, hl7fhir: false },
      capsLoaded: true,
    });
    useNode.mockReturnValue({ selectedNodes: ["abc"] });

    render(<Navbar />);
    expect(screen.getByRole("link", { name: "Semantic-Alignment" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "HL7 FHIR" })).toBeNull();
  });

  it("shows HL7 FHIR when capability is enabled", () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      logout: vi.fn(),
      capabilities: { semanticAlignment: false, hl7fhir: true },
      capsLoaded: true,
    });
    useNode.mockReturnValue({ selectedNodes: ["abc"] });

    render(<Navbar />);
    expect(screen.queryByRole("link", { name: "Semantic-Alignment" })).toBeNull();
    expect(screen.getByRole("link", { name: "HL7 FHIR" })).toBeInTheDocument();
  });
});