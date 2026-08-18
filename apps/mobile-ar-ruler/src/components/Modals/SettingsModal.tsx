import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
  Modal,
  ScrollView,
} from "react-native";
import { DistanceUnit } from "@plainoss/core";
import { AppSettings } from "../../types/app";

interface SettingsModalProps {
  visible: boolean;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onClose: () => void;
}

const UNITS: DistanceUnit[] = ["m", "cm", "mm", "in", "ft", "yd"];
const PRECISIONS = [0, 1, 2, 3];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  settings,
  onUpdateSettings,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Preferences & Settings</Text>
              <Text style={styles.subtitle}>
                Configure measurement defaults
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityLabel="Close Settings"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Precision Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Decimal Precision</Text>
              <Text style={styles.sectionDescription}>
                Number of decimal places shown in measurement values
              </Text>
              <View style={styles.pillsRow}>
                {PRECISIONS.map((p) => {
                  const isActive = settings.precision === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.pill, isActive && styles.pillActive]}
                      onPress={() => onUpdateSettings({ precision: p })}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          isActive && styles.pillTextActive,
                        ]}
                      >
                        {p} {p === 1 ? "dec" : "decs"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Default Unit Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Default Distance Unit</Text>
              <Text style={styles.sectionDescription}>
                Primary unit selected when opening the app
              </Text>
              <View style={styles.pillsRow}>
                {UNITS.map((u) => {
                  const isActive = settings.defaultUnit === u;
                  return (
                    <TouchableOpacity
                      key={u}
                      style={[styles.pill, isActive && styles.pillActive]}
                      onPress={() => onUpdateSettings({ defaultUnit: u })}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          isActive && styles.pillTextActive,
                        ]}
                      >
                        {u}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Toggles */}
            <View style={styles.section}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextContainer}>
                  <Text style={styles.toggleLabel}>Haptic Feedback</Text>
                  <Text style={styles.toggleDescription}>
                    Vibrate on point drop, save, and leveling snap
                  </Text>
                </View>
                <Switch
                  value={settings.hapticsEnabled}
                  onValueChange={(val) =>
                    onUpdateSettings({ hapticsEnabled: val })
                  }
                  trackColor={{ false: "#27272a", true: "#3b82f6" }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.toggleRow}>
                <View style={styles.toggleTextContainer}>
                  <Text style={styles.toggleLabel}>Rule of Thirds Grid</Text>
                  <Text style={styles.toggleDescription}>
                    Display alignment grid over viewfinder
                  </Text>
                </View>
                <Switch
                  value={settings.gridEnabled}
                  onValueChange={(val) =>
                    onUpdateSettings({ gridEnabled: val })
                  }
                  trackColor={{ false: "#27272a", true: "#3b82f6" }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* About PlainOSS */}
            <View style={styles.aboutCard}>
              <Text style={styles.aboutTitle}>PlainOSS AR Ruler v0.1.0</Text>
              <Text style={styles.aboutText}>
                Free, ad-free, and privacy-respecting spatial tools. All
                measurements are processed locally on your device.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#13131a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingBottom: 28,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f8fafc",
  },
  subtitle: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: {
    color: "#94a3b8",
    fontSize: 16,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 20,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 14,
    padding: 14,
  },
  sectionTitle: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  sectionDescription: {
    color: "#94a3b8",
    fontSize: 11,
    marginBottom: 10,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  pillActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#60a5fa",
  },
  pillText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  pillTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  toggleTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  toggleLabel: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "600",
  },
  toggleDescription: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginVertical: 10,
  },
  aboutCard: {
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  aboutTitle: {
    color: "#60a5fa",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  aboutText: {
    color: "#94a3b8",
    fontSize: 11,
    lineHeight: 16,
  },
});
