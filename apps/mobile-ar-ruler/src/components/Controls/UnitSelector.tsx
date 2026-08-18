import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { DistanceUnit, AngleUnit } from "@plainoss/core";
import { ExtendedMeasurementMode } from "../../types/app";

interface UnitSelectorProps {
  mode: ExtendedMeasurementMode;
  unit: DistanceUnit;
  angleUnit: AngleUnit;
  onSelectUnit: (unit: DistanceUnit) => void;
  onSelectAngleUnit: (unit: AngleUnit) => void;
}

const DISTANCE_UNITS: { id: DistanceUnit; label: string }[] = [
  { id: "m", label: "Meters (m)" },
  { id: "cm", label: "Centimeters (cm)" },
  { id: "mm", label: "Millimeters (mm)" },
  { id: "in", label: "Inches (in)" },
  { id: "ft", label: "Feet (ft)" },
  { id: "yd", label: "Yards (yd)" },
];

const ANGLE_UNITS: { id: AngleUnit; label: string }[] = [
  { id: "deg", label: "Degrees (°)" },
  { id: "rad", label: "Radians (rad)" },
];

export const UnitSelector: React.FC<UnitSelectorProps> = ({
  mode,
  unit,
  angleUnit,
  onSelectUnit,
  onSelectAngleUnit,
}) => {
  if (mode === "level") return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {mode === "angle"
          ? ANGLE_UNITS.map((u) => {
              const isActive = angleUnit === u.id;
              return (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.unitBtn, isActive && styles.unitBtnActive]}
                  onPress={() => onSelectAngleUnit(u.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.unitText, isActive && styles.unitTextActive]}>
                    {u.label}
                  </Text>
                </TouchableOpacity>
              );
            })
          : DISTANCE_UNITS.map((u) => {
              const isActive = unit === u.id;
              return (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.unitBtn, isActive && styles.unitBtnActive]}
                  onPress={() => onSelectUnit(u.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.unitText, isActive && styles.unitTextActive]}>
                    {u.id}
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
    paddingVertical: 4,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 6,
  },
  unitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  unitBtnActive: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderColor: "#3b82f6",
  },
  unitText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  unitTextActive: {
    color: "#60a5fa",
    fontWeight: "700",
  },
});
