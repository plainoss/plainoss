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
        const type = t.type || "info";

        let Icon = Info;
        if (type === "success") {
          Icon = CheckCircle2;
        } else if (type === "warning") {
          Icon = AlertTriangle;
        }

        return (
          <div
            key={t.id}
            className={`toast toast-${type}`}
            role={type === "warning" ? "alert" : "status"}
          >
            <Icon size={16} aria-hidden="true" className="toast-icon" />
            <span className="toast-message">{t.text}</span>
            <button
              type="button"
              className="toast-dismiss"
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
