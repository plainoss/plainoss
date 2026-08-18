import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { ExtendedMeasurementMode } from "../../types/app";

interface MeasurementCardProps {
  title: string;
  primaryValue: string;
  primaryUnit: string;
  pointsCount: number;
  mode: ExtendedMeasurementMode;
  secondaryMetrics?: {
    perimeter?: string;
    deltaX?: string;
    deltaY?: string;
    deltaZ?: string;
    pitch?: number;
    roll?: number;
  };
}

export const MeasurementCard: React.FC<MeasurementCardProps> = ({
  title,
  primaryValue,
  primaryUnit,
  pointsCount,
  mode,
  secondaryMetrics,
}) => {
  return (
    <View style={styles.card}>
      {/* Card Header */}
      <View style={styles.headerRow}>
        <View style={styles.modeBadge}>
          <Text style={styles.modeBadgeText}>{title}</Text>
        </View>
        {mode !== "level" && (
          <Text style={styles.pointsCount}>
            {pointsCount} {pointsCount === 1 ? "point" : "points"}
          </Text>
        )}
      </View>

      {/* Big Value Readout */}
      <View style={styles.valueRow}>
        <Text style={styles.bigNumber}>{primaryValue}</Text>
        <Text style={styles.unitText}>{primaryUnit}</Text>
      </View>

      {/* Secondary Metrics / Sub-Info */}
      {secondaryMetrics && (
        <View style={styles.secondaryContainer}>
          {secondaryMetrics.perimeter && (
            <View style={styles.secondaryItem}>
              <Text style={styles.secondaryLabel}>Perimeter:</Text>
              <Text style={styles.secondaryValue}>
                {secondaryMetrics.perimeter}
              </Text>
            </View>
          )}

          {secondaryMetrics.deltaX && secondaryMetrics.deltaY && (
            <View style={styles.deltaRow}>
              <Text style={styles.deltaItem}>
                ΔX: {secondaryMetrics.deltaX}
              </Text>
              <Text style={styles.deltaItem}>
                ΔY: {secondaryMetrics.deltaY}
              </Text>
              {secondaryMetrics.deltaZ && (
                <Text style={styles.deltaItem}>
                  ΔZ: {secondaryMetrics.deltaZ}
                </Text>
              )}
            </View>
          )}

          {mode === "level" &&
            secondaryMetrics.roll !== undefined &&
            secondaryMetrics.pitch !== undefined && (
              <View style={styles.deltaRow}>
                <Text style={styles.deltaItem}>
                  Roll: {secondaryMetrics.roll}°
                </Text>
                <Text style={styles.deltaItem}>
                  Pitch: {secondaryMetrics.pitch}°
                </Text>
              </View>
            )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    backgroundColor: "rgba(16, 16, 22, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  modeBadge: {
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  modeBadgeText: {
    color: "#60a5fa",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pointsCount: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "500",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginVertical: 2,
  },
  bigNumber: {
    fontSize: 32,
    fontWeight: "900",
    color: "#f8fafc",
    letterSpacing: -1,
  },
  unitText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3b82f6",
  },
  secondaryContainer: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  secondaryItem: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  secondaryLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "500",
  },
  secondaryValue: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "700",
  },
  deltaRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  deltaItem: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
  },
});
