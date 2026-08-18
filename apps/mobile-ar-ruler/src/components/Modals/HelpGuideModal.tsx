import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";

interface HelpGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: "🎯",
    title: "1. Aim the Center Reticle",
    description:
      "Point your device camera at the target surface. Keep the device steady until the reticle turns green (indicating a level baseline).",
  },
  {
    icon: "📏",
    title: "2. Adjust Depth Calibration",
    description:
      "Use the depth controls (+ / − or quick presets: 0.5m, 1.5m, 3m) to match the estimated distance between your device and the object.",
  },
  {
    icon: "📍",
    title: "3. Drop Measurement Points",
    description:
      "Tap the large center button (📍) to place points: 2 points for Distance, 2+ for continuous Paths, 3+ for Surface Area, or 3 for Angles.",
  },
  {
    icon: "💾",
    title: "4. Save & Export",
    description:
      "Tap Save (💾) once your measurement is complete. Access your history anytime to copy to clipboard or export as CSV / JSON.",
  },
];

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({
  visible,
  onClose,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>How to Measure with AR</Text>
              <Text style={styles.subtitle}>Quick user guide & best practices</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close Guide">
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {STEPS.map((step, idx) => (
              <View key={idx} style={styles.stepCard}>
                <View style={styles.iconCircle}>
                  <Text style={styles.stepIcon}>{step.icon}</Text>
                </View>
                <View style={styles.stepTextContainer}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.description}</Text>
                </View>
              </View>
            ))}

            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>💡 Pro Tips for Maximum Accuracy</Text>
              <Text style={styles.tipText}>
                • Ensure good lighting or toggle the built-in torch (💡).{"\n"}
                • For flat surfaces (tables, floors), keep the green level indicator active.{"\n"}
                • Calibrate depth before dropping the first anchor point.
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Got it!</Text>
          </TouchableOpacity>
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
    maxHeight: "85%",
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
  stepCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  stepIcon: {
    fontSize: 20,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  stepDesc: {
    color: "#94a3b8",
    fontSize: 11,
    lineHeight: 16,
  },
  tipCard: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    borderRadius: 12,
    padding: 14,
    marginVertical: 10,
  },
  tipTitle: {
    color: "#34d399",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  tipText: {
    color: "#94a3b8",
    fontSize: 11,
    lineHeight: 18,
  },
  doneBtn: {
    backgroundColor: "#3b82f6",
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  doneBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
