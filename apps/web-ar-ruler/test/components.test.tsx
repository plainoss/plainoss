import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { HelpModal } from "../src/components/HelpModal";
import { HistoryDrawer } from "../src/components/HistoryDrawer";

describe("Escape key accessibility for modals and drawers", () => {
  it("calls onClose when Escape key is pressed on HelpModal", () => {
    const handleClose = vi.fn();
    render(<HelpModal isOpen={true} onClose={handleClose} />);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when HelpModal is closed", () => {
    const handleClose = vi.fn();
    render(<HelpModal isOpen={false} onClose={handleClose} />);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(handleClose).not.toHaveBeenCalled();
  });

  it("calls onClose when Escape key is pressed on HistoryDrawer", () => {
    const handleClose = vi.fn();
    render(
      <HistoryDrawer
        isOpen={true}
        onClose={handleClose}
        records={[]}
        onDeleteRecord={vi.fn()}
        onClearAll={vi.fn()}
        onCopyRecord={vi.fn()}
        onCopyAll={vi.fn()}
      />
    );

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
