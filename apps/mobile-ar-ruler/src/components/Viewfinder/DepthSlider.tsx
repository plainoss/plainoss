import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { DistanceUnit, formatDistance } from "@plainoss/core";

interface DepthSliderProps {
  targetDistance: number;
  unit: DistanceUnit;
  onChangeDistance: (dist: number | ((prev: number) => number)) => void;
}

const PRESETS = [0.5, 1.5, 3.0, 5.0];

export const DepthSlider: React.FC<DepthSliderProps> = ({
  targetDistance,
  unit,
  onChangeDistance,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Step decrease */}
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onChangeDistance((d) => Math.max(0.3, d - 0.2))}
          accessibilityLabel="Decrease Depth"
        >
          <Text style={styles.stepBtnText}>−</Text>
        </TouchableOpacity>

        {/* Current Depth */}
        <View style={styles.readout}>
          <Text style={styles.readoutLabel}>Depth Calibration</Text>
          <Text style={styles.readoutValue}>
            {formatDistance(targetDistance, unit, 2)}
          </Text>
        </View>

        {/* Step increase */}
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onChangeDistance((d) => Math.min(15.0, d + 0.2))}
          accessibilityLabel="Increase Depth"
        >
          <Text style={styles.stepBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Presets */}
      <View style={styles.presetsRow}>
        {PRESETS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.presetBtn,
              Math.abs(targetDistance - p) < 0.15 && styles.presetBtnActive,
            ]}
            onPress={() => onChangeDistance(p)}
          >
            <Text
              style={[
                styles.presetBtnText,
                Math.abs(targetDistance - p) < 0.15 && styles.presetBtnTextActive,
              ]}
            >
              {p >= 1 ? `${p}m` : `${p * 100}cm`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    backgroundColor: "rgba(10, 10, 14, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  stepBtnText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  readout: {
    alignItems: "center",
    minWidth: 110,
  },
  readoutLabel: {
    color: "#94a3b8",
    fontSize: 9,
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  readoutValue: {
    color: "#60a5fa",
    fontSize: 13,
    fontWeight: "800",
  },
  presetsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  presetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  presetBtnActive: {
    backgroundColor: "#3b82f6",
  },
  presetBtnText: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "600",
  },
  presetBtnTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
});
