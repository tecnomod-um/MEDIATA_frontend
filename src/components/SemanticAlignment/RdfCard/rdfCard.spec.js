import React from "react";
import { render as mount, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import RdfCard from "./rdfCard";
import RdfConnection from "./rdfConnection";

jest.mock("../rdf.module.css", () => new Proxy({}, { get: (_, key) => key }));
jest.mock("@mui/icons-material/Close", () => () => <span data-testid="icon-close" />);

describe("RdfCard", () => {
  const CARD = {
    id: "c1",
    elementName: "My Element",
    optionLabel: "My Option",
    x: 42,
    y: 84,
    optionColor: "#123456",
  };

  let handlers;

  beforeEach(() => {
    handlers = {
      onMouseDown: jest.fn(),
      onTouchStart: jest.fn(),
      onCardClick: jest.fn(),
      onRemoveCard: jest.fn(),
    };

    mount(<RdfCard card={CARD} {...handlers} />);
  });

  it("renders title and subtitle", () => {
    expect(screen.getByRole("heading", { name: "My Element" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My Option", level: 4 })).toBeInTheDocument();
  });

  it("applies backgroundColor from card.optionColor (no parent traversal)", () => {
    const header = screen.getByLabelText("Card header: My Element");
    expect(header).toHaveStyle({ backgroundColor: "rgb(18, 52, 86)" });
  });

  it("calls onMouseDown with (event, id)", () => {
    const cardButton = screen.getByRole("button", { name: "My Element" });
    fireEvent.mouseDown(cardButton, { button: 0 });
    expect(handlers.onMouseDown).toHaveBeenCalledWith(expect.any(Object), "c1");
  });

  it("calls onTouchStart with (event, id)", () => {
    const cardButton = screen.getByRole("button", { name: "My Element" });
    fireEvent.touchStart(cardButton);
    expect(handlers.onTouchStart).toHaveBeenCalledWith(expect.any(Object), "c1");
  });

  it("calls onCardClick and stops propagation", () => {
    const cardButton = screen.getByRole("button", { name: "My Element" });
    const evt = { stopPropagation: jest.fn() };
    fireEvent.click(cardButton, evt);
    expect(handlers.onCardClick).toHaveBeenCalledWith("c1");
  });

  it("calls onRemoveCard when Close is clicked", () => {
    const closeBtn = screen.getByRole("button", { name: /close/i });
    const evt = { stopPropagation: jest.fn() };
    fireEvent.click(closeBtn, evt);
    expect(handlers.onRemoveCard).toHaveBeenCalledWith("c1");
  });
});

describe("RdfConnection", () => {
  beforeAll(() => {
    // Ensure CSS vars resolve to empty so defaults (220x100) apply
    window.getComputedStyle = () => ({ getPropertyValue: () => "" });
  });

  it("renders nothing when no cards", () => {
    mount(<RdfConnection connections={[]} cards={[]} />);
    expect(screen.queryByRole("img", { name: /rdf connections/i })).toBeNull();
  });

  it("renders an SVG with a single line between two cards", () => {
    const cards = [
      { id: "c1", x: 0, y: 0 },
      { id: "c2", x: 220, y: 0 },
    ];
    const connections = [{ id: "e1", from: "c1", to: "c2" }];

    mount(<RdfConnection connections={connections} cards={cards} />);

    const svg = screen.getByRole("img", { name: /rdf connections/i });
    expect(svg).toBeInTheDocument();

    const line = screen.getByLabelText("RDF connection line");
    expect(line).toBeInTheDocument();
    expect(line).toHaveAttribute("x1", "110");
    expect(line).toHaveAttribute("y1", "50");
    expect(line).toHaveAttribute("x2", "220");
    expect(line).toHaveAttribute("y2", "50");
  });
});
