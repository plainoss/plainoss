import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { ExtendedMeasurementMode } from "../../types/app";

interface ActionToolbarProps {
  mode: ExtendedMeasurementMode;
  pointsCount: number;
  isReadyToSave: boolean;
  onDropPoint: () => void;
  onUndo: () => void;
  onClear: () => void;
  onSave: () => void;
}

export const ActionToolbar: React.FC<ActionToolbarProps> = ({
  mode,
  pointsCount,
  isReadyToSave,
  onDropPoint,
  onUndo,
  onClear,
  onSave,
}) => {
  const isLevel = mode === "level";

  return (
    <View style={styles.container}>
      {/* Undo Button */}
      <TouchableOpacity
        style={[
          styles.sideBtn,
          (pointsCount === 0 || isLevel) && styles.sideBtnDisabled,
        ]}
        onPress={onUndo}
        disabled={pointsCount === 0 || isLevel}
        activeOpacity={0.7}
        accessibilityLabel="Undo Point"
      >
        <Text style={styles.sideBtnIcon}>↩️</Text>
        <Text style={styles.sideBtnText}>Undo</Text>
      </TouchableOpacity>

      {/* Main Placement Action Button */}
      <TouchableOpacity
        style={styles.mainBtn}
        onPress={isLevel ? onSave : onDropPoint}
        activeOpacity={0.8}
        accessibilityLabel={isLevel ? "Save Level Reading" : "Drop Measurement Point"}
      >
        <View style={styles.mainBtnOuterRing}>
          <View style={[styles.mainBtnInner, isLevel && styles.mainBtnInnerLevel]}>
            <Text style={styles.mainBtnIcon}>{isLevel ? "💾" : "📍"}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Save or Clear Button */}
      <TouchableOpacity
        style={[
          styles.sideBtn,
          isReadyToSave && !isLevel && styles.sideBtnSave,
          pointsCount === 0 && !isLevel && !isReadyToSave && styles.sideBtnDisabled,
        ]}
        onPress={isReadyToSave ? onSave : onClear}
        disabled={pointsCount === 0 && !isReadyToSave && !isLevel}
        activeOpacity={0.7}
        accessibilityLabel={isReadyToSave ? "Save Measurement" : "Clear Points"}
      >
        <Text style={styles.sideBtnIcon}>
          {isReadyToSave ? "💾" : "🗑️"}
        </Text>
        <Text
          style={[
            styles.sideBtnText,
            isReadyToSave && !isLevel && styles.sideBtnTextSave,
          ]}
        >
          {isReadyToSave ? "Save" : "Clear"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "rgba(10, 10, 14, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  sideBtn: {
    minWidth: 78,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  sideBtnSave: {
    backgroundColor: "#10b981",
  },
  sideBtnDisabled: {
    opacity: 0.35,
  },
  sideBtnIcon: {
    fontSize: 16,
  },
  sideBtnText: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "700",
  },
  sideBtnTextSave: {
    color: "#ffffff",
  },
  mainBtn: {
    width: 76,
    height: 76,
    justifyContent: "center",
    alignItems: "center",
  },
  mainBtnOuterRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderWidth: 2,
    borderColor: "rgba(59, 130, 246, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  mainBtnInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  mainBtnInnerLevel: {
    backgroundColor: "#10b981",
    shadowColor: "#10b981",
  },
  mainBtnIcon: {
    fontSize: 26,
  },
});
