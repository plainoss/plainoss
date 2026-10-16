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
          role={t.type === "warning" ? "alert" : "status"}
          aria-atomic="true"
        >
          <span>{t.text}</span>
          <button
            type="button"
            className="toast-dismiss-btn"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss notification"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
};
