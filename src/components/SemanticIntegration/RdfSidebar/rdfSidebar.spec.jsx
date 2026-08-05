import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import RdfSidebar from "./rdfSidebar.jsx";

let lastProps = null;

vi.mock("../../Common/ElementList/elementList.jsx", () => ({
  __esModule: true,
  default: (props) => {
    lastProps = props;
    return (
      <div data-testid="element-list">
        {props.items.map((item, idx) => (
          <div
            key={item.id}
            data-testid={`item-${idx}`}
            onClick={() => props.onSelect(idx, null)}
          >
            {item.label}
          </div>
        ))}
      </div>
    );
  },
}));

describe("RdfSidebar", () => {
  const elementsProp = {
    elements: [
      { name: "ElemA", categories: ["c1", "c2"] },
      { name: "ElemB", categories: [] },
    ],
  };

  const builtClasses = { 0: true };

  beforeEach(() => {
    lastProps = null;
    vi.clearAllMocks();
  });

  it("passes correct props to ElementList", () => {
    const handleSelect = vi.fn();

    render(
      <RdfSidebar
        elements={elementsProp}
        activeElementIndex={1}
        activeCategoryIndex={null}
        onSelectElement={handleSelect}
        builtClasses={builtClasses}
      />
    );

    expect(lastProps).not.toBeNull();
    expect(lastProps.items).toEqual([
      { id: "ElemA", label: "ElemA", categories: ["c1", "c2"] },
      { id: "ElemB", label: "ElemB", categories: [] },
    ]);
    expect(lastProps.activeIndex).toBe(1);
    expect(lastProps.activeCategoryIndex).toBeNull();
    expect(lastProps.builtClasses).toBe(builtClasses);
    expect(lastProps.searchPlaceholder).toBe("Search elements");
    expect(lastProps.showCategories).toBe(false);
    expect(typeof lastProps.onSelect).toBe("function");
  });

  it("calls onSelectElement when an item is clicked", () => {
    const handleSelect = vi.fn();

    render(
      <RdfSidebar
        elements={elementsProp}
        activeElementIndex={0}
        activeCategoryIndex={null}
        onSelectElement={handleSelect}
        builtClasses={{}}
      />
    );

    fireEvent.click(screen.getByTestId("item-1"));
    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(1, null);
  });

  it("handles missing elements prop gracefully", () => {
    const handleSelect = vi.fn();

    render(
      <RdfSidebar
        elements={null}
        activeElementIndex={0}
        activeCategoryIndex={null}
        onSelectElement={handleSelect}
        builtClasses={{}}
      />
    );

    expect(lastProps.items).toEqual([]);
    expect(screen.getByTestId("element-list")).toBeEmptyDOMElement();
  });
});