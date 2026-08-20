import React, { useEffect } from "react";
import { X, Copy, Trash2, Ruler } from "lucide-react";
import { MeasurementRecord } from "@plainoss/core";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  records: MeasurementRecord[];
  onDeleteRecord: (id: string) => void;
  onClearAll: () => void;
  onCopyRecord: (record: MeasurementRecord) => void;
  onCopyAll: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  records,
  onDeleteRecord,
  onClearAll,
  onCopyRecord,
  onCopyAll,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="drawer-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Measurement History"
    >
      <aside className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h2>Measurement History</h2>
          <button
            className="btn-icon"
            onClick={onClose}
            aria-label="Close history panel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="drawer-toolbar">
          <button
            className="btn btn-secondary btn-sm"
            onClick={onCopyAll}
            disabled={records.length === 0}
          >
            <Copy size={14} />
            <span>Copy All</span>
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={onClearAll}
            disabled={records.length === 0}
          >
            <Trash2 size={14} />
            <span>Clear History</span>
          </button>
        </div>

        <div className="drawer-list">
          {records.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">
                <Ruler size={36} strokeWidth={1.5} />
              </span>
              <p>No saved measurements yet.</p>
              <span className="empty-sub">
                Take measurements and click "Save" to log them here.
              </span>
            </div>
          ) : (
            records.map((r) => (
              <div key={r.id} className="history-card">
                <div className="history-card-header">
                  <span className="history-mode-tag">
                    {r.mode.toUpperCase()}
                  </span>
                  <span className="history-time">
                    {new Date(r.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="history-value">{r.formatted}</div>
                <div className="history-points-info">
                  {r.points.length} points • {r.label || "Standard Measurement"}
                </div>
                <div className="history-card-actions">
                  <button
                    className="btn btn-secondary btn-xs"
                    onClick={() => onCopyRecord(r)}
                  >
                    <Copy size={12} />
                    <span>Copy</span>
                  </button>
                  <button
                    className="btn btn-danger btn-xs"
                    onClick={() => onDeleteRecord(r.id)}
                  >
                    <Trash2 size={12} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
};
