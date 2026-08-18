import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { ChevronDown, Plus, Check, Pencil } from "lucide-react-native";
import { DistanceUnit } from "@plainoss/core";
import { THEME } from "../theme/colors";

interface BottomBarProps {
  unit: DistanceUnit;
  draggedHandleIndex: number | null;
  hoveredHandleIndex: number | null;
  onOpenUnitPicker: () => void;
  onTriggerAction: () => void;
}

export function BottomBar({
  unit,
  draggedHandleIndex,
  hoveredHandleIndex,
  onOpenUnitPicker,
  onTriggerAction,
}: BottomBarProps) {
  const isDragging = draggedHandleIndex !== null;
  const isHovering = hoveredHandleIndex !== null && !isDragging;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Unit Selector Badge */}
      <TouchableOpacity
        style={styles.unitBadge}
        onPress={onOpenUnitPicker}
        activeOpacity={0.7}
        accessibilityLabel="Select measurement unit"
      >
        <Text style={styles.unitText}>{unit.toUpperCase()}</Text>
        <ChevronDown size={14} color={THEME.textSecondary} strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Primary Action Button (Thumb trigger) */}
      <TouchableOpacity
        style={[
          styles.actionBtn,
          isDragging && styles.actionBtnDragging,
          isHovering && styles.actionBtnHovered,
        ]}
        onPress={onTriggerAction}
        activeOpacity={0.75}
        accessibilityLabel={
          isDragging
            ? "Lock point position"
            : isHovering
              ? "Edit point position"
              : "Place point"
        }
      >
        <View
          style={[
            styles.actionBtnInner,
            isDragging && styles.actionBtnInnerDragging,
            isHovering && styles.actionBtnInnerHovered,
          ]}
        >
          {isDragging ? (
            <Check size={26} color="#ffffff" strokeWidth={3} />
          ) : isHovering ? (
            <Pencil size={24} color="#ffffff" strokeWidth={2.5} />
          ) : (
            <Plus size={26} color="#ffffff" strokeWidth={3} />
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 36,
    left: 20,
    right: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    gap: 16,
  },
  unitBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.bgSurface,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  unitText: {
    color: THEME.textPrimary,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  actionBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(56, 189, 248, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: THEME.accentCyan,
    shadowColor: THEME.accentCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  actionBtnHovered: {
    backgroundColor: "rgba(245, 158, 11, 0.25)",
    borderColor: THEME.accentGold,
    shadowColor: THEME.accentGold,
  },
  actionBtnDragging: {
    backgroundColor: "rgba(34, 197, 94, 0.25)",
    borderColor: THEME.accentGreen,
    shadowColor: THEME.accentGreen,
  },
  actionBtnInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: THEME.accentBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtnInnerHovered: {
    backgroundColor: "#d97706",
  },
  actionBtnInnerDragging: {
    backgroundColor: "#16a34a",
  },
});
