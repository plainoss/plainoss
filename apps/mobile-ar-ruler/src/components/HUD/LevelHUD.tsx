import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { DeviceOrientationState } from "../../types/app";

interface LevelHUDProps {
  orientation: DeviceOrientationState;
}

export const LevelHUD: React.FC<LevelHUDProps> = ({ orientation }) => {
  const { pitch, roll, isLevel } = orientation;

  // Constrain bubble offsets for visual display (bounds: -60 to +60 px)
  const bubbleX = Math.max(-60, Math.min(60, roll * 3.5));
  const bubbleY = Math.max(-60, Math.min(60, pitch * 3.5));

  return (
    <View style={styles.container}>
      <View style={[styles.dialContainer, isLevel && styles.dialContainerLevel]}>
        {/* Crosshair guide */}
        <View style={[styles.crossH, isLevel && styles.crossLevel]} />
        <View style={[styles.crossV, isLevel && styles.crossLevel]} />

        {/* Center Target Circle */}
        <View style={[styles.centerRing, isLevel && styles.centerRingLevel]} />

        {/* Fluid Bubble */}
        <View
          style={[
            styles.bubble,
            isLevel && styles.bubbleLevel,
            {
              transform: [{ translateX: bubbleX }, { translateY: bubbleY }],
            },
          ]}
        />
      </View>

      {/* Angle Readouts */}
      <View style={styles.metricsRow}>
        <View style={styles.metricBlock}>
          <Text style={styles.metricLabel}>Roll (X)</Text>
          <Text style={[styles.metricValue, isLevel && styles.metricValueLevel]}>
            {roll > 0 ? `+${roll.toFixed(1)}°` : `${roll.toFixed(1)}°`}
          </Text>
        </View>

        <View style={styles.statusBadge}>
          <Text style={[styles.statusText, isLevel && styles.statusTextLevel]}>
            {isLevel ? "PERFECTLY LEVEL" : "ALIGN SURFACE"}
          </Text>
        </View>

        <View style={styles.metricBlock}>
          <Text style={styles.metricLabel}>Pitch (Y)</Text>
          <Text style={[styles.metricValue, isLevel && styles.metricValueLevel]}>
            {pitch > 0 ? `+${pitch.toFixed(1)}°` : `${pitch.toFixed(1)}°`}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 6,
  },
  dialContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(10, 10, 14, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  dialContainerLevel: {
    borderColor: "#10b981",
    backgroundColor: "rgba(6, 78, 59, 0.25)",
  },
  crossH: {
    position: "absolute",
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  crossV: {
    position: "absolute",
    height: "100%",
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  crossLevel: {
    backgroundColor: "rgba(16, 185, 129, 0.4)",
  },
  centerRing: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderStyle: "dashed",
  },
  centerRingLevel: {
    borderColor: "#10b981",
    backgroundColor: "rgba(16, 185, 129, 0.2)",
  },
  bubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#3b82f6",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  bubbleLevel: {
    backgroundColor: "#10b981",
    shadowColor: "#10b981",
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "90%",
    marginTop: 10,
  },
  metricBlock: {
    alignItems: "center",
  },
  metricLabel: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  metricValue: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "800",
  },
  metricValueLevel: {
    color: "#10b981",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  statusText: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  statusTextLevel: {
    color: "#10b981",
  },
});
