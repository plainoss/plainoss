import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
} from "react-native";
import {
  X,
  RotateCcw,
  Scan,
  Crosshair,
  Ruler,
  CheckCircle2,
  Move,
  Hand,
} from "lucide-react-native";
import { THEME } from "../theme/colors";

interface TopBarProps {
  isScanning: boolean;
  pointsCount: number;
  hoveredHandleIndex: number | null;
  draggedHandleIndex: number | null;
  onExit: () => void;
  onReset: () => void;
}

export function TopBar({
  isScanning,
  pointsCount,
  hoveredHandleIndex,
  draggedHandleIndex,
  onExit,
  onReset,
}: TopBarProps) {
  // Pulsing animation for scanning dot
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isScanning) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => {
        loop.stop();
      };
    } else {
      pulseAnim.setValue(1);
      return undefined;
    }
  }, [isScanning, pulseAnim]);

  // Determine status message and icon
  let statusText = "Surface detected — Tap to set Point 1";
  let StatusIcon = Crosshair;
  let iconColor = THEME.accentCyan;

  if (isScanning) {
    statusText = "Move phone slowly to detect surface...";
    StatusIcon = Scan;
    iconColor = THEME.accentGold;
  } else if (draggedHandleIndex !== null) {
    statusText = `Moving Point ${draggedHandleIndex + 1} — Aim & tap to lock`;
    StatusIcon = Move;
    iconColor = THEME.accentGreen;
  } else if (hoveredHandleIndex !== null && pointsCount > 0) {
    statusText = `Tap to grab Point ${hoveredHandleIndex + 1} & edit line`;
    StatusIcon = Hand;
    iconColor = THEME.accentGold;
  } else if (pointsCount === 0) {
    statusText = "Surface detected — Tap to set Point 1";
    StatusIcon = Crosshair;
    iconColor = THEME.accentCyan;
  } else if (pointsCount === 1) {
    statusText = "Move to endpoint & tap for Point 2";
    StatusIcon = Ruler;
    iconColor = THEME.accentCyan;
  } else if (pointsCount >= 2) {
    statusText = "Measurement locked (Aim at handle to edit)";
    StatusIcon = CheckCircle2;
    iconColor = THEME.accentGreen;
  }

  const hasPoints = pointsCount > 0;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Exit Button */}
      <TouchableOpacity
        style={styles.circleBtn}
        onPress={onExit}
        activeOpacity={0.7}
        accessibilityLabel="Exit AR Mode"
      >
        <X size={20} color={THEME.textPrimary} strokeWidth={2.2} />
      </TouchableOpacity>

      {/* Dynamic Status Pill */}
      <View
        style={[styles.statusPill, isScanning && styles.statusPillScanning]}
      >
        {isScanning ? (
          <Animated.View
            style={[
              styles.pulseDot,
              {
                opacity: pulseAnim,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
        ) : (
          <StatusIcon size={16} color={iconColor} strokeWidth={2.2} />
        )}
        <Text style={styles.statusText} numberOfLines={1} ellipsizeMode="tail">
          {statusText}
        </Text>
      </View>

      {/* Clear / Reset Button */}
      <TouchableOpacity
        style={[styles.circleBtn, hasPoints && styles.circleBtnActive]}
        onPress={onReset}
        disabled={!hasPoints}
        activeOpacity={0.7}
        accessibilityLabel="Clear measurement"
      >
        <RotateCcw
          size={18}
          color={hasPoints ? THEME.accentCyan : THEME.textMuted}
          strokeWidth={2.2}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 48,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 100,
    gap: 8,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.bgSurface,
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  circleBtnActive: {
    borderColor: THEME.borderAccent,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
  },
  statusPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.bgSurface,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  statusPillScanning: {
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.accentGold,
  },
  statusText: {
    color: THEME.textPrimary,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.2,
    flexShrink: 1,
  },
});
