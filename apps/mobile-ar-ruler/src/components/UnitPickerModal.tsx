import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { Check, X } from "lucide-react-native";
import { DistanceUnit } from "@plainoss/core";
import { THEME } from "../theme/colors";

interface UnitOption {
  unit: DistanceUnit;
  label: string;
  symbol: string;
}

const UNIT_OPTIONS: UnitOption[] = [
  { unit: "m", label: "Meters", symbol: "m" },
  { unit: "cm", label: "Centimeters", symbol: "cm" },
  { unit: "in", label: "Inches", symbol: "in" },
  { unit: "ft", label: "Feet", symbol: "ft" },
  { unit: "mm", label: "Millimeters", symbol: "mm" },
  { unit: "yd", label: "Yards", symbol: "yd" },
];

interface UnitPickerModalProps {
  visible: boolean;
  selectedUnit: DistanceUnit;
  onSelectUnit: (unit: DistanceUnit) => void;
  onClose: () => void;
}

export function UnitPickerModal({
  visible,
  selectedUnit,
  onSelectUnit,
  onClose,
}: UnitPickerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              <View style={styles.header}>
                <Text style={styles.title}>Select Measurement Unit</Text>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="Close unit selector"
                >
                  <X size={20} color={THEME.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsList}>
                {UNIT_OPTIONS.map((opt) => {
                  const isSelected = selectedUnit === opt.unit;
                  return (
                    <TouchableOpacity
                      key={opt.unit}
                      style={[
                        styles.optionRow,
                        isSelected && styles.optionRowSelected,
                      ]}
                      onPress={() => {
                        onSelectUnit(opt.unit);
                        onClose();
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.optionInfo}>
                        <Text
                          style={[
                            styles.optionSymbol,
                            isSelected && styles.optionSymbolSelected,
                          ]}
                        >
                          {opt.symbol}
                        </Text>
                        <Text
                          style={[
                            styles.optionLabel,
                            isSelected && styles.optionLabelSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </View>
                      {isSelected && (
                        <Check
                          size={18}
                          color={THEME.accentCyan}
                          strokeWidth={2.5}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: THEME.bgSurfaceSolid,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  optionsList: {
    gap: 8,
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  optionRowSelected: {
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderColor: THEME.accentCyan,
  },
  optionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionSymbol: {
    fontSize: 15,
    fontWeight: "800",
    color: THEME.textSecondary,
    width: 32,
  },
  optionSymbolSelected: {
    color: THEME.accentCyan,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: THEME.textPrimary,
  },
  optionLabelSelected: {
    color: THEME.textPrimary,
  },
});
