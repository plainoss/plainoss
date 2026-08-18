import React from "react";
import {
  Ruler,
  Spline,
  Hexagon,
  Compass,
  Magnet,
  Undo2,
  Trash2,
} from "lucide-react";
import { MeasurementMode, DistanceUnit } from "@plainoss/core";

interface ToolbarProps {
  mode: MeasurementMode;
  onSelectMode: (mode: MeasurementMode) => void;
  unit: DistanceUnit;
  onSelectUnit: (unit: DistanceUnit) => void;
  pointCount: number;
  onUndo: () => void;
  onClear: () => void;
  snapToGrid: boolean;
  onToggleSnap: () => void;
  onLoadPreset: (presetName: string) => void;
}

const MODES: {
  id: MeasurementMode;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { id: "distance", label: "Distance", icon: Ruler },
  { id: "path", label: "Path", icon: Spline },
  { id: "polygon", label: "Area", icon: Hexagon },
  { id: "angle", label: "Angle", icon: Compass },
];

const UNITS: DistanceUnit[] = ["m", "cm", "mm", "in", "ft", "yd"];

export const Toolbar: React.FC<ToolbarProps> = ({
  mode,
  onSelectMode,
  unit,
  onSelectUnit,
  pointCount,
  onUndo,
  onClear,
  snapToGrid,
  onToggleSnap,
  onLoadPreset,
}) => {
  return (
    <div
      className="toolbar-container"
      role="toolbar"
      aria-label="Measurement Controls"
    >
      {/* Mode Selectors */}
      <div
        className="segmented-group"
        role="radiogroup"
        aria-label="Measurement Mode"
      >
        {MODES.map((m) => {
          const IconComp = m.icon;
          return (
            <button
              key={m.id}
              role="radio"
              aria-checked={mode === m.id}
              className={`btn-segment ${mode === m.id ? "active" : ""}`}
              onClick={() => onSelectMode(m.id)}
              title={`Switch to ${m.label} Mode`}
            >
              <span aria-hidden="true">
                <IconComp size={15} />
              </span>
              <span className="segment-label">{m.label}</span>
            </button>
          );
        })}
      </div>

      <div className="toolbar-divider" aria-hidden="true" />

      {/* Unit Selectors */}
      <div
        className="segmented-group"
        role="radiogroup"
        aria-label="Distance Unit"
      >
        {UNITS.map((u) => (
          <button
            key={u}
            role="radio"
            aria-checked={unit === u}
            className={`btn-segment btn-unit ${unit === u ? "active" : ""}`}
            onClick={() => onSelectUnit(u)}
          >
            {u}
          </button>
        ))}
      </div>

      <div className="toolbar-divider" aria-hidden="true" />

      {/* Action buttons */}
      <div className="toolbar-actions">
        <button
          className={`btn btn-secondary btn-icon-text ${snapToGrid ? "btn-active-toggle" : ""}`}
          onClick={onToggleSnap}
          title="Snap to nearest 0.5m grid intersection"
          aria-pressed={snapToGrid}
        >
          <span aria-hidden="true">
            <Magnet size={15} />
          </span>
          <span className="btn-label">Snap</span>
        </button>

        <button
          className="btn btn-secondary btn-icon-text"
          onClick={onUndo}
          disabled={pointCount === 0}
          title="Undo last point (Z)"
        >
          <span aria-hidden="true">
            <Undo2 size={15} />
          </span>
          <span className="btn-label">Undo</span>
        </button>

        <button
          className="btn btn-danger btn-icon-text"
          onClick={onClear}
          disabled={pointCount === 0}
          title="Clear all points (Esc)"
        >
          <span aria-hidden="true">
            <Trash2 size={15} />
          </span>
          <span className="btn-label">Clear</span>
        </button>

        {/* Presets dropdown */}
        <select
          className="preset-select"
          onChange={(e) => {
            if (e.target.value) {
              onLoadPreset(e.target.value);
              e.target.value = "";
            }
          }}
          aria-label="Load Geometry Preset"
        >
          <option value="">Presets...</option>
          <option value="room">Sample Room (4m x 3m)</option>
          <option value="desk">Desk Dimensions (1.6m x 0.8m)</option>
          <option value="triangle">Right Triangle (3-4-5m)</option>
          <option value="sloped">Roof Slope (3D Angle)</option>
        </select>
      </div>
    </div>
  );
};
