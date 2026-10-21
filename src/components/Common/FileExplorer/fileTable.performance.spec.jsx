import React from "react";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FileTable from "./fileTable";

const { iconRenderSpy } = vi.hoisted(() => ({
  iconRenderSpy: vi.fn(),
}));

vi.mock("./fileTypeIcon", () => ({
  default: ({ name }) => {
    iconRenderSpy(name);
    return <span aria-hidden="true" />;
  },
}));

describe("FileTable rendering", () => {
  const files = Array.from({ length: 60 }, (_, index) => ({
    name: `file-${index}.csv`,
    nodeId: "default",
    sizeBytes: index + 1,
    createdAtMs: 1000 + index,
    lastModifiedAtMs: 2000 + index,
  }));
  const longPressFired = { current: false };
  const baseProps = {
    sorted: files,
    selected: new Set(),
    busy: false,
    processingFiles: new Set(),
    fileProgress: new Map(),
    nodes: [],
    onRowMouseDown: vi.fn(),
    onRowMouseUp: vi.fn(),
    onRowMouseLeave: vi.fn(),
    longPressFired,
    onRowClick: vi.fn(),
    onRowDoubleClick: vi.fn(),
    renamingKey: null,
    renameInputRef: { current: null },
    renameDraft: "",
    setRenameDraft: vi.fn(),
    commitRename: vi.fn(),
    cancelRename: vi.fn(),
    formatBytes: (value) => String(value),
    formatDateTime: (value) => String(value),
    isNew: () => false,
    relatedMode: false,
    relatedInfoByKey: new Map(),
  };

  beforeEach(() => {
    iconRenderSpy.mockClear();
  });

  it("rerenders only rows whose visible state changes", () => {
    const { rerender } = render(<FileTable {...baseProps} />);
    expect(iconRenderSpy).toHaveBeenCalledTimes(files.length);

    rerender(
      <FileTable
        {...baseProps}
        selected={new Set(["default::file-20.csv"])}
      />
    );
    expect(iconRenderSpy).toHaveBeenCalledTimes(files.length + 1);

    rerender(
      <FileTable
        {...baseProps}
        selected={new Set(["default::file-20.csv"])}
        renamingKey="default::file-20.csv"
        renameDraft="file-20.csv"
      />
    );
    expect(iconRenderSpy).toHaveBeenCalledTimes(files.length + 2);

    rerender(
      <FileTable
        {...baseProps}
        selected={new Set(["default::file-20.csv"])}
        renamingKey="default::file-20.csv"
        renameDraft="renamed-file.csv"
      />
    );
    expect(iconRenderSpy).toHaveBeenCalledTimes(files.length + 3);

    rerender(
      <FileTable
        {...baseProps}
        selected={new Set(["default::file-20.csv"])}
        processingFiles={new Set(["default::file-40.csv"])}
        fileProgress={new Map([["default::file-40.csv", { mode: "bar", value: 50 }]])}
      />
    );
    expect(iconRenderSpy).toHaveBeenCalledTimes(files.length + 5);
  });
});
