import React from "react";
import { X, Info, CheckCircle2, AlertTriangle } from "lucide-react";

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
        const handleKeyDown = (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onDismiss(t.id);
          }
        };

        let Icon = Info;
        if (type === "success") Icon = CheckCircle2;
        if (type === "warning") Icon = AlertTriangle;

        return (
          <div
            key={t.id}
            role="status"
            className={`toast toast-${type}`}
            onClick={() => onDismiss(t.id)}
          >
            <span className="toast-icon" aria-hidden="true">
              <Icon size={16} />
            </span>
            <span className="toast-text">{t.text}</span>
            <button
              type="button"
              className="toast-dismiss-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(t.id);
              }}
              onKeyDown={handleKeyDown}
              aria-label="Dismiss notification"
              title="Dismiss notification"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
