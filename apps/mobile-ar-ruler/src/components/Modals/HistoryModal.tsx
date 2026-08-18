import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import {
  MobileMeasurementRecord,
  ExtendedMeasurementMode,
} from "../../types/app";
import { copyRecordsToClipboard, shareRecordsAsFile } from "../../utils/export";

interface HistoryModalProps {
  visible: boolean;
  history: MobileMeasurementRecord[];
  onClose: () => void;
  onDeleteRecord: (id: string) => void;
  onClearHistory: () => void;
}

const FILTER_MODES: { id: ExtendedMeasurementMode | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "distance", label: "Distance" },
  { id: "path", label: "Path" },
  { id: "polygon", label: "Area" },
  { id: "angle", label: "Angle" },
  { id: "height", label: "Height" },
  { id: "level", label: "Level" },
];

export const HistoryModal: React.FC<HistoryModalProps> = ({
  visible,
  history,
  onClose,
  onDeleteRecord,
  onClearHistory,
}) => {
  const [filter, setFilter] = useState<ExtendedMeasurementMode | "all">("all");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const filtered =
    filter === "all" ? history : history.filter((r) => r.mode === filter);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleCopyClipboard = async () => {
    const ok = await copyRecordsToClipboard(filtered);
    if (ok) {
      showStatus("📋 Copied measurements to clipboard!");
    }
  };

  const handleShareCSV = async () => {
    await shareRecordsAsFile(filtered, "csv");
  };

  const handleShareJSON = async () => {
    await shareRecordsAsFile(filtered, "json");
  };

  const handleConfirmClear = () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to delete all saved measurements?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: onClearHistory,
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Sheet Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Saved Measurements</Text>
              <Text style={styles.subtitle}>
                {history.length} {history.length === 1 ? "record" : "records"}{" "}
                recorded
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityLabel="Close History"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Status Message toast */}
          {statusMessage && (
            <View style={styles.statusToast}>
              <Text style={styles.statusToastText}>{statusMessage}</Text>
            </View>
          )}

          {/* Filter Carousel */}
          <View style={styles.filterRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              {FILTER_MODES.map((fm) => (
                <TouchableOpacity
                  key={fm.id}
                  style={[
                    styles.filterPill,
                    filter === fm.id && styles.filterPillActive,
                  ]}
                  onPress={() => setFilter(fm.id)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      filter === fm.id && styles.filterPillTextActive,
                    ]}
                  >
                    {fm.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Records List */}
          <ScrollView style={styles.list}>
            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📐</Text>
                <Text style={styles.emptyText}>
                  No saved measurements found
                </Text>
                <Text style={styles.emptySubtext}>
                  Complete a measurement in the camera viewfinder and tap Save.
                </Text>
              </View>
            ) : (
              filtered.map((item) => (
                <View key={item.id} style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <View style={styles.modeTag}>
                      <Text style={styles.modeTagText}>
                        {item.mode.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.recordDate}>
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      • {new Date(item.timestamp).toLocaleDateString()}
                    </Text>
                    <TouchableOpacity
                      onPress={() => onDeleteRecord(item.id)}
                      style={styles.deleteBtn}
                      accessibilityLabel="Delete measurement"
                    >
                      <Text style={styles.deleteBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.recordValue}>{item.formatted}</Text>

                  {item.secondaryMetrics?.perimeter && (
                    <Text style={styles.recordDetail}>
                      Perimeter: {item.secondaryMetrics.perimeter}
                    </Text>
                  )}

                  {item.secondaryMetrics?.deltaX &&
                    item.secondaryMetrics?.deltaY && (
                      <Text style={styles.recordDetail}>
                        ΔX: {item.secondaryMetrics.deltaX} | ΔY:{" "}
                        {item.secondaryMetrics.deltaY}
                      </Text>
                    )}
                </View>
              ))
            )}
          </ScrollView>

          {/* Action Footer */}
          {history.length > 0 && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.footerBtn}
                onPress={handleCopyClipboard}
              >
                <Text style={styles.footerBtnText}>📋 Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.footerBtn}
                onPress={handleShareCSV}
              >
                <Text style={styles.footerBtnText}>📊 CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.footerBtn}
                onPress={handleShareJSON}
              >
                <Text style={styles.footerBtnText}>📦 JSON</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerBtn, styles.footerBtnDanger]}
                onPress={handleConfirmClear}
              >
                <Text style={styles.footerBtnTextDanger}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )}
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
    paddingBottom: 24,
    maxHeight: "82%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
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
  statusToast: {
    backgroundColor: "rgba(16, 185, 129, 0.9)",
    marginHorizontal: 20,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  statusToastText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  filterRow: {
    marginBottom: 12,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  filterPillActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#60a5fa",
  },
  filterPillText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  filterPillTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  list: {
    paddingHorizontal: 20,
    maxHeight: 360,
  },
  emptyState: {
    paddingVertical: 36,
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyText: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
  },
  emptySubtext: {
    color: "#64748b",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 240,
  },
  recordCard: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  recordHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  modeTag: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modeTagText: {
    color: "#60a5fa",
    fontSize: 10,
    fontWeight: "800",
  },
  recordDate: {
    color: "#64748b",
    fontSize: 11,
  },
  deleteBtn: {
    padding: 4,
  },
  deleteBtnText: {
    fontSize: 14,
  },
  recordValue: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  recordDetail: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 3,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
    alignItems: "center",
  },
  footerBtnDanger: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  footerBtnText: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "700",
  },
  footerBtnTextDanger: {
    color: "#f87171",
    fontSize: 12,
    fontWeight: "700",
  },
});
