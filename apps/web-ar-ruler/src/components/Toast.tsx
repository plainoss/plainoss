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
    >
      {toasts.map((t) => {
        const isWarning = t.type === "warning";
        return (
          <div
            key={t.id}
            className={`toast toast-${t.type || "info"}`}
            role={isWarning ? "alert" : "status"}
            aria-live={isWarning ? "assertive" : "polite"}
          >
            <span className="toast-text">{t.text}</span>
            <button
              type="button"
              className="toast-dismiss-btn"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
