import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import RelatedDatasetLegend from "./relatedDatasetLegend";

describe("<RelatedDatasetLegend />", () => {
  it("summarizes every visible related-dataset group", () => {
    render(
      <RelatedDatasetLegend
        groups={[
          { groupId: "G1", color: "#9B5DE5", count: 3 },
          { groupId: "G2", color: "#FF8A1F", count: 2 },
        ]}
      />
    );

    expect(screen.getByRole("note", { name: "Related dataset groups" })).toBeInTheDocument();
    expect(screen.getByText("G1")).toBeInTheDocument();
    expect(screen.getByText("3 datasets")).toBeInTheDocument();
    expect(screen.getByText("G2")).toBeInTheDocument();
    expect(screen.getByText("2 datasets")).toBeInTheDocument();
    expect(screen.getByText("Groups show datasets related across nodes")).toBeInTheDocument();
  });

  it("renders nothing without groups", () => {
    const { container } = render(<RelatedDatasetLegend groups={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
