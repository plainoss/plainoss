import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";

interface HeaderProps {
  torch: boolean;
  hasCamera: boolean;
  onToggleTorch: () => void;
  historyCount: number;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  torch,
  hasCamera,
  onToggleTorch,
  historyCount,
  onOpenHistory,
  onOpenSettings,
  onOpenHelp,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.brandBlock}>
        <Text style={styles.title}>AR Ruler</Text>
        <Text style={styles.subtitle}>PlainOSS Spatial Measurement</Text>
      </View>

      <View style={styles.actionsBlock}>
        {hasCamera && (
          <TouchableOpacity
            style={[styles.iconButton, torch && styles.iconButtonActive]}
            onPress={onToggleTorch}
            accessibilityLabel="Toggle Flashlight"
          >
            <Text style={styles.iconText}>{torch ? "🔦" : "💡"}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.iconButton}
          onPress={onOpenHelp}
          accessibilityLabel="Open Help Guide"
        >
          <Text style={styles.iconText}>❓</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={onOpenSettings}
          accessibilityLabel="Open Settings"
        >
          <Text style={styles.iconText}>⚙️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.historyButton, historyCount > 0 && styles.historyButtonWithData]}
          onPress={onOpenHistory}
          accessibilityLabel="Open Saved Measurements History"
        >
          <Text style={styles.historyButtonText}>
            📋 {historyCount > 0 ? `(${historyCount})` : "History"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(10, 10, 14, 0.9)",
  },
  brandBlock: {
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f8fafc",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
  },
  actionsBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconButtonActive: {
    backgroundColor: "#eab308",
    borderColor: "#fde047",
  },
  iconText: {
    fontSize: 16,
  },
  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  historyButtonWithData: {
    borderColor: "#3b82f6",
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },
  historyButtonText: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "700",
  },
});
