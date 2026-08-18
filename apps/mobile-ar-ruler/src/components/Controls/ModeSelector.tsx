import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { ExtendedMeasurementMode } from "../../types/app";

interface ModeSelectorProps {
  currentMode: ExtendedMeasurementMode;
  onSelectMode: (mode: ExtendedMeasurementMode) => void;
}

const MODES: { id: ExtendedMeasurementMode; label: string; icon: string }[] = [
  { id: "distance", label: "Distance", icon: "📏" },
  { id: "path", label: "Path", icon: "〰️" },
  { id: "polygon", label: "Area", icon: "⬡" },
  { id: "angle", label: "Angle", icon: "📐" },
  { id: "height", label: "Height", icon: "↕️" },
  { id: "level", label: "Level", icon: "⚖️" },
];

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  onSelectMode,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {MODES.map((m) => {
          const isActive = currentMode === m.id;
          return (
            <TouchableOpacity
              key={m.id}
              style={[styles.modeBtn, isActive && styles.modeBtnActive]}
              onPress={() => onSelectMode(m.id)}
              activeOpacity={0.7}
              accessibilityLabel={`Select ${m.label} Mode`}
            >
              <Text style={styles.modeIcon}>{m.icon}</Text>
              <Text style={[styles.modeLabel, isActive && styles.modeLabelActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 6,
  },
  modeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  modeBtnActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#60a5fa",
  },
  modeIcon: {
    fontSize: 14,
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
  modeLabelActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
