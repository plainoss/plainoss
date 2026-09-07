import React from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

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
      {toasts.map((t) => {
        const toastType = t.type || "info";
        const Icon =
          toastType === "success"
            ? CheckCircle2
            : toastType === "warning"
              ? AlertTriangle
              : Info;

        return (
          <div
            key={t.id}
            className={`toast toast-${toastType}`}
            role={toastType === "warning" ? "alert" : "status"}
          >
            <span className="toast-icon" aria-hidden="true">
              <Icon size={16} />
            </span>
            <span className="toast-text">{t.text}</span>
            <button
              type="button"
              className="toast-dismiss-btn"
              onClick={() => onDismiss(t.id)}
              aria-label={`Dismiss notification: ${t.text}`}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
