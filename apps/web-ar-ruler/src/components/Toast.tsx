import React from "react";
import { X } from "lucide-react";

export interface ToastMessage {
  id: string;
  text: string;
  type?: "info" | "success" | "warning";
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-container"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.type || "info"}`}
          onClick={() => onDismiss(t.id)}
        >
          <span>{t.text}</span>
          <button
            className="toast-dismiss-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(t.id);
            }}
            aria-label="Dismiss notification"
            title="Dismiss notification"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "2px",
              marginLeft: "8px",
              display: "inline-flex",
              alignItems: "center",
              color: "inherit",
              opacity: 0.8,
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
