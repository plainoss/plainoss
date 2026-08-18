import React from "react";
import { Theme } from "../hooks/useTheme";

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  isARSupported: boolean;
  isARActive: boolean;
  onToggleAR: () => void;
  onOpenHelp: () => void;
  onOpenHistory: () => void;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  isARSupported,
  isARActive,
  onToggleAR,
  onOpenHelp,
  onOpenHistory,
  historyCount,
}) => {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-logo" aria-hidden="true">
          📐
        </div>
        <div>
          <h1 className="brand-title">AR Ruler</h1>
          <span className="brand-subtitle">
            PlainOSS 3D Spatial Measurement
          </span>
        </div>
      </div>

      <nav className="header-actions" aria-label="Main Navigation">
        {isARSupported && (
          <button
            className={`btn btn-ar ${isARActive ? "btn-ar-active" : ""}`}
            onClick={onToggleAR}
            title={isARActive ? "Exit WebXR AR" : "Enter WebXR AR Camera Mode"}
          >
            <span aria-hidden="true">{isARActive ? "⏹" : "📷"}</span>
            <span>{isARActive ? "Stop AR" : "Start AR"}</span>
          </button>
        )}

        <button
          className="btn btn-secondary btn-badge-wrapper"
          onClick={onOpenHistory}
          aria-label="Measurement History"
          title="Measurement History"
        >
          <span aria-hidden="true">📋</span>
          <span>History</span>
          {historyCount > 0 && (
            <span className="badge-count">{historyCount}</span>
          )}
        </button>

        <button
          className="btn-icon"
          onClick={onOpenHelp}
          aria-label="Help and Shortcuts"
          title="Help & Shortcuts"
        >
          ❓
        </button>

        <button
          className="btn-icon"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </nav>
    </header>
  );
};
