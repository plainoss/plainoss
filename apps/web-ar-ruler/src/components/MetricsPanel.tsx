import React from "react";
import { Copy, BookmarkCheck } from "lucide-react";
import {
  Point3D,
  MeasurementMode,
  DistanceUnit,
  AngleUnit,
  distance3D,
  pathLength3D,
  perimeter3D,
  polygonArea3D,
  angleBetween3D,
  formatDistance,
  formatArea,
  formatAngle,
  boundingBox3D,
} from "@plainoss/core";

interface MetricsPanelProps {
  points: Point3D[];
  hoverPoint: Point3D | null;
  mode: MeasurementMode;
  unit: DistanceUnit;
  angleUnit: AngleUnit;
  onCopy: (text: string, label: string) => void;
  onSave: () => void;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  points,
  hoverPoint,
  mode,
  unit,
  angleUnit,
  onCopy,
  onSave,
}) => {
  // Compute metrics based on active mode
  let primaryValue = "0.00";
  let primaryUnit = unit;
  let primaryLabel = "Measurement";
  let copyableString = "";

  const activePoints = [...points];
  if (hoverPoint && points.length > 0) {
    // Show live preview
    activePoints.push(hoverPoint);
  }

  if (mode === "distance") {
    primaryLabel = "Linear Distance";
    const p0 = activePoints[0];
    const p1 = activePoints[1];
    if (p0 && p1) {
      const d = distance3D(p0, p1);
      primaryValue = formatDistance(d, unit, 2).split(" ")[0] ?? "0.00";
      primaryUnit = unit;
      copyableString = formatDistance(d, unit, 3);
    } else {
      primaryValue = "0.00";
    }
  } else if (mode === "path") {
    primaryLabel = "Continuous Path";
    const len = pathLength3D(activePoints);
    primaryValue = formatDistance(len, unit, 2).split(" ")[0] ?? "0.00";
    primaryUnit = unit;
    copyableString = formatDistance(len, unit, 3);
  } else if (mode === "polygon") {
    primaryLabel = "Surface Area";
    const area = polygonArea3D(activePoints);
    primaryValue = formatArea(area, unit, 2).split(" ")[0] ?? "0.00";
    primaryUnit = `${unit}²` as any;
    copyableString = formatArea(area, unit, 3);
  } else if (mode === "angle") {
    primaryLabel = "Angle at Vertex P2";
    const p0 = activePoints[0];
    const p1 = activePoints[1];
    const p2 = activePoints[2];
    if (p0 && p1 && p2) {
      const ang = angleBetween3D(p0, p1, p2, angleUnit);
      primaryValue = formatAngle(ang, angleUnit, 1)
        .replace("°", "")
        .replace(" rad", "");
      primaryUnit = (angleUnit === "deg" ? "°" : "rad") as any;
      copyableString = formatAngle(ang, angleUnit, 2);
    } else {
      primaryValue = "0.0";
      primaryUnit = (angleUnit === "deg" ? "°" : "rad") as any;
    }
  }

  // Sub metrics
  const bbox = points.length > 0 ? boundingBox3D(points) : null;
  const perimeter =
    points.length >= 3 && mode === "polygon" ? perimeter3D(points) : null;

  return (
    <div className="metrics-card">
      <div className="metrics-header">
        <span className="metrics-mode-pill">{primaryLabel}</span>
        <span className="points-counter">
          {points.length} point{points.length === 1 ? "" : "s"} placed
        </span>
      </div>

      <div className="metrics-primary-display">
        <div className="metrics-number-wrapper">
          <span className="metrics-big-number">{primaryValue}</span>
          <span className="metrics-unit-symbol">{primaryUnit}</span>
        </div>

        <div className="metrics-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() =>
              onCopy(
                copyableString || `${primaryValue} ${primaryUnit}`,
                primaryLabel,
              )
            }
            disabled={points.length === 0}
            title="Copy value to clipboard"
          >
            <Copy size={14} />
            <span>Copy</span>
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={onSave}
            disabled={
              points.length < (mode === "angle" || mode === "polygon" ? 3 : 2)
            }
            title="Save to Measurement History"
          >
            <BookmarkCheck size={14} />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Sub-breakdown details */}
      <div className="metrics-sub-details">
        {perimeter !== null && (
          <div className="sub-metric-row">
            <span className="sub-metric-label">Perimeter:</span>
            <span className="sub-metric-value">
              {formatDistance(perimeter, unit)}
            </span>
          </div>
        )}

        {bbox && (
          <div className="sub-metric-row">
            <span className="sub-metric-label">Bounding Box (XYZ):</span>
            <span className="sub-metric-value">
              {formatDistance(bbox.dimensions.x, unit, 1)} ×{" "}
              {formatDistance(bbox.dimensions.y, unit, 1)} ×{" "}
              {formatDistance(bbox.dimensions.z, unit, 1)}
            </span>
          </div>
        )}

        {mode === "path" && points.length > 2 && (
          <div className="sub-metric-row">
            <span className="sub-metric-label">Total Segments:</span>
            <span className="sub-metric-value">{points.length - 1}</span>
          </div>
        )}
      </div>
    </div>
  );
};
