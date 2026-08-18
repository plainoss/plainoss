import React from "react";
import {
  Ruler,
  Camera,
  Square,
  AlertTriangle,
  History,
  HelpCircle,
  Sun,
  Moon,
} from "lucide-react";
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
          <Ruler size={22} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="brand-title">AR Ruler</h1>
          <span className="brand-subtitle">
            PlainOSS WebXR Spatial Measurement
          </span>
        </div>
      </div>

      <nav className="header-actions" aria-label="Main Navigation">
        {isARSupported ? (
          <button
            className={`btn btn-ar ${isARActive ? "btn-ar-active" : ""}`}
            onClick={onToggleAR}
            title={
              isARActive ? "Exit WebXR AR" : "Enter WebXR Immersive AR Mode"
            }
          >
            <span aria-hidden="true">
              {isARActive ? <Square size={16} /> : <Camera size={16} />}
            </span>
            <span>{isARActive ? "Stop AR" : "Start AR"}</span>
          </button>
        ) : (
          <button
            className="btn btn-secondary btn-ar-unsupported"
            disabled
            title="WebXR Immersive AR is not supported on this browser/device. Requires Chrome on ARCore Android, Quest Browser, or WebXR headset."
          >
            <span aria-hidden="true">
              <AlertTriangle size={16} />
            </span>
            <span>AR Not Supported</span>
          </button>
        )}

        <button
          className="btn btn-secondary btn-badge-wrapper"
          onClick={onOpenHistory}
          aria-label="Measurement History"
          title="Measurement History"
        >
          <span aria-hidden="true">
            <History size={16} />
          </span>
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
          <HelpCircle size={18} />
        </button>

        <button
          className="btn-icon"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </nav>
    </header>
  );
};
