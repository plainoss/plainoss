import React from "react";
import { CheckCircle2, AlertTriangle, HelpCircle, X } from "lucide-react";

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
        let IconComponent = HelpCircle;
        if (t.type === "success") {
          IconComponent = CheckCircle2;
        } else if (t.type === "warning") {
          IconComponent = AlertTriangle;
        }

        return (
          <div
            key={t.id}
            className={`toast toast-${t.type || "info"}`}
            onClick={() => onDismiss(t.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onDismiss(t.id);
              }
            }}
            tabIndex={0}
            role="status"
          >
            <span className="toast-icon" aria-hidden="true">
              <IconComponent size={16} />
            </span>
            <span className="toast-text">{t.text}</span>
            <button
              type="button"
              className="toast-dismiss-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(t.id);
              }}
              aria-label="Dismiss notification"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
