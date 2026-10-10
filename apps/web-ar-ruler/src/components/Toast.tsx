import React from "react";

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
          role="button"
          tabIndex={0}
          aria-label={`Dismiss notification: ${t.text}`}
          className={`toast toast-${t.type || "info"}`}
          onClick={() => onDismiss(t.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onDismiss(t.id);
            }
          }}
        >
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
};
