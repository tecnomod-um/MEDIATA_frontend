import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import TableMergeControl from "./tableMergeControl";

it("keeps the Merge label fixed and changes the icon with the chosen display mode", () => {
  function Controlled() {
    const [combined, setCombined] = useState(false);
    return <TableMergeControl tableName="Numerical" combined={combined} onChange={setCombined} mappingCount={3} onEditMappings={vi.fn()} />;
  }
  render(<Controlled />);
  const separate = screen.getByRole("button", { name: "Numerical table options: separate rows" });
  const separateIcon = separate.querySelector("svg").innerHTML;
  expect(separate).toHaveTextContent(/^Merge$/);
  fireEvent.click(separate);
  fireEvent.click(screen.getByRole("menuitem", { name: "Combined rows" }));
  const combined = screen.getByRole("button", { name: "Numerical table options: combined rows" });
  expect(combined).toHaveTextContent(/^Merge$/);
  expect(combined.querySelector("svg").innerHTML).not.toBe(separateIcon);
  fireEvent.click(combined);
  fireEvent.click(screen.getByRole("menuitem", { name: "Separate rows" }));
  expect(screen.getByRole("button", { name: "Numerical table options: separate rows" })).toHaveTextContent(/^Merge$/);
});

it("opens Combine features from the table menu", () => {
  const edit = vi.fn();
  render(<TableMergeControl tableName="Numerical" combined={false} onChange={vi.fn()} mappingCount={3} onEditMappings={edit} />);
  fireEvent.click(screen.getByRole("button"));
  fireEvent.click(screen.getByRole("menuitem", { name: "Combine features" }));
  expect(edit).toHaveBeenCalledOnce();
});
