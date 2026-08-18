import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { DistanceUnit, formatDistance } from "@plainoss/core";

interface SpatialReticleProps {
  targetDistance: number;
  unit: DistanceUnit;
  isLevel: boolean;
  isVertical: boolean;
}

export const SpatialReticle: React.FC<SpatialReticleProps> = ({
  targetDistance,
  unit,
  isLevel,
  isVertical,
}) => {
  const formattedDist = formatDistance(targetDistance, unit, 2);

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Leveling crosshair lines */}
      <View style={[styles.crosshairH, isLevel && styles.crosshairLevel]} />
      <View style={[styles.crosshairV, isLevel && styles.crosshairLevel]} />

      {/* Target reticle outer circle */}
      <View
        style={[
          styles.ring,
          isLevel && styles.ringLevel,
          isVertical && styles.ringVertical,
        ]}
      />

      {/* Target reticle center dot */}
      <View style={[styles.dot, isLevel && styles.dotLevel]} />

      {/* Depth distance badge */}
      <View style={[styles.badge, isLevel && styles.badgeLevel]}>
        <Text style={styles.badgeText}>
          {isLevel ? "🎯 LEVEL • " : ""}
          {formattedDist}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -40,
    marginTop: -40,
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  crosshairH: {
    position: "absolute",
    width: 48,
    height: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  crosshairV: {
    position: "absolute",
    width: 1.5,
    height: 48,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  crosshairLevel: {
    backgroundColor: "#10b981",
  },
  ring: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#3b82f6",
    borderStyle: "dashed",
    backgroundColor: "rgba(59, 130, 246, 0.05)",
  },
  ringLevel: {
    borderColor: "#10b981",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  ringVertical: {
    borderColor: "#8b5cf6",
  },
  dot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#60a5fa",
  },
  dotLevel: {
    backgroundColor: "#10b981",
  },
  badge: {
    position: "absolute",
    bottom: -24,
    backgroundColor: "rgba(10, 10, 14, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeLevel: {
    borderColor: "#10b981",
    backgroundColor: "rgba(6, 78, 59, 0.9)",
  },
  badgeText: {
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: "700",
  },
});
