import React from "react";
import { StyleSheet, View, Text } from "react-native";
import Svg, { Line, Polygon, Circle, Text as SvgText } from "react-native-svg";
import { Point3D, DistanceUnit, distance3D, formatDistance } from "@plainoss/core";
import { ExtendedMeasurementMode } from "../../types/app";
import { project3DtoScreen } from "../../utils/projection";

interface PointsOverlayProps {
  points: Point3D[];
  mode: ExtendedMeasurementMode;
  unit: DistanceUnit;
  viewWidth: number;
  viewHeight: number;
}

export const PointsOverlay: React.FC<PointsOverlayProps> = ({
  points,
  mode,
  unit,
  viewWidth,
  viewHeight,
}) => {
  if (viewWidth <= 0 || viewHeight <= 0 || points.length === 0) {
    return null;
  }

  // Project 3D points to 2D screen space
  const projected = points.map((p) => project3DtoScreen(p, viewWidth, viewHeight));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={viewWidth} height={viewHeight} style={StyleSheet.absoluteFill}>
        {/* Polygon surface fill in area mode */}
        {mode === "polygon" && projected.length >= 3 && (
          <Polygon
            points={projected.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="rgba(59, 130, 246, 0.2)"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="4 2"
          />
        )}

        {/* Lines between consecutive points */}
        {projected.map((curr, idx) => {
          if (idx === 0) return null;
          const prev = projected[idx - 1];
          if (!prev) return null;

          const rawDist = points[idx] && points[idx - 1] ? distance3D(points[idx - 1]!, points[idx]!) : 0;
          const formattedSeg = formatDistance(rawDist, unit, 2);
          const midX = (prev.x + curr.x) / 2;
          const midY = (prev.y + curr.y) / 2;

          return (
            <React.Fragment key={`line-${idx}`}>
              <Line
                x1={prev.x}
                y1={prev.y}
                x2={curr.x}
                y2={curr.y}
                stroke={mode === "height" ? "#10b981" : "#60a5fa"}
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Segment distance label */}
              <SvgText
                x={midX}
                y={midY - 8}
                fill="#ffffff"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                {formattedSeg}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Closing line for polygon */}
        {mode === "polygon" && projected.length >= 3 && projected[0] && projected[projected.length - 1] && (
          <Line
            x1={projected[projected.length - 1]!.x}
            y1={projected[projected.length - 1]!.y}
            x2={projected[0]!.x}
            y2={projected[0]!.y}
            stroke="#60a5fa"
            strokeWidth="2"
            strokeDasharray="3 3"
          />
        )}

        {/* Point Vertices */}
        {projected.map((p, idx) => {
          return (
            <React.Fragment key={`point-${idx}`}>
              {/* Outer glow ring */}
              <Circle
                cx={p.x}
                cy={p.y}
                r={12 * p.scale}
                fill="rgba(59, 130, 246, 0.4)"
              />
              {/* Core point dot */}
              <Circle
                cx={p.x}
                cy={p.y}
                r={6 * p.scale}
                fill="#ffffff"
                stroke="#3b82f6"
                strokeWidth="2"
              />
            </React.Fragment>
          );
        })}
      </Svg>

      {/* HTML / React Native Tags for Point vertex labels */}
      {projected.map((p, idx) => (
        <View
          key={`tag-${idx}`}
          style={[
            styles.vertexPill,
            {
              left: p.x - 14,
              top: p.y - 30,
              transform: [{ scale: p.scale }],
            },
          ]}
        >
          <Text style={styles.vertexPillText}>P{idx + 1}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  vertexPill: {
    position: "absolute",
    backgroundColor: "rgba(10, 10, 14, 0.85)",
    borderWidth: 1,
    borderColor: "#60a5fa",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  vertexPillText: {
    color: "#60a5fa",
    fontSize: 10,
    fontWeight: "800",
  },
});
