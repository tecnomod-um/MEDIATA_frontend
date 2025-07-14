import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import RdfCard from "./rdfCard";
import RdfConnection from "./rdfConnection";

jest.mock("../rdf.module.css", () => new Proxy({}, {
  get: (_, key) => key
}));

jest.mock("@mui/icons-material/Close", () => () => <span data-testid="icon-close" />);

describe("RdfCard", () => {
  const CARD = {
    id: "c1",
    elementName: "My Element",
    optionLabel: "My Option",
    x: 42,
    y: 84,
    optionColor: "#123456"
  };
  let handlers;

  beforeEach(() => {
    handlers = {
      onMouseDown: jest.fn(),
      onTouchStart: jest.fn(),
      onCardClick: jest.fn(),
      onRemoveCard: jest.fn(),
    };
    render(
      <RdfCard
        card={CARD}
        {...handlers}
      />
    );
  });

  it("renders title and subtitle", () => {
    expect(screen.getByText("My Element")).toBeInTheDocument();
    expect(screen.getByText("My Option")).toBeInTheDocument();
  });

  it("applies backgroundColor from card.optionColor", () => {
    const header = screen.getByText("My Element").parentElement;
    expect(header).toHaveStyle({ backgroundColor: "#123456" });
  });

  it("calls onMouseDown with (event, id)", () => {
    const card = screen.getByText("My Element").closest("div");
    fireEvent.mouseDown(card, { button: 0 });
    expect(handlers.onMouseDown).toHaveBeenCalledWith(expect.any(Object), "c1");
  });

  it("calls onTouchStart with (event, id)", () => {
    const card = screen.getByText("My Element").closest("div");
    fireEvent.touchStart(card);
    expect(handlers.onTouchStart).toHaveBeenCalledWith(expect.any(Object), "c1");
  });

  it("calls onCardClick and stops propagation", () => {
    const card = screen.getByText("My Element").closest("div");
    const evt = { stopPropagation: jest.fn() };
    fireEvent.click(card, evt);
    expect(handlers.onCardClick).toHaveBeenCalledWith("c1");
  });

  it("calls onRemoveCard when Close button clicked and stops propagation", () => {
    const closeBtn = screen.getByTestId("icon-close").parentElement;
    const evt = { stopPropagation: jest.fn() };
    fireEvent.click(closeBtn, evt);
    expect(handlers.onRemoveCard).toHaveBeenCalledWith("c1");
  });
});

describe("RdfConnection", () => {
  beforeAll(() => {
    window.getComputedStyle = () => ({ getPropertyValue: () => "" });
  });

  it("renders nothing when no cards", () => {
    const { container } = render(
      <RdfConnection connections={[]} cards={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders an SVG with a single line between two cards", () => {
    const cards = [
      { id: "c1", x: 0, y: 0 },
      { id: "c2", x: 220, y: 0 },
    ];
    const connections = [
      { id: "e1", from: "c1", to: "c2" }
    ];
    render(<RdfConnection connections={connections} cards={cards} />);
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
    const line = svg.querySelector("line");
    expect(line).toBeInTheDocument();
    expect(line).toHaveAttribute("x1", "110");
    expect(line).toHaveAttribute("y1", "50");
    expect(line).toHaveAttribute("x2", "220");
    expect(line).toHaveAttribute("y2", "50");
  });
});
