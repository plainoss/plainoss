import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Vibration,
  Platform,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  Point3D,
  MeasurementMode,
  DistanceUnit,
  AngleUnit,
  MeasurementRecord,
  distance3D,
  pathLength3D,
  perimeter3D,
  polygonArea3D,
  angleBetween3D,
  formatDistance,
  formatArea,
  formatAngle,
} from "@plainoss/core";

const MODES: { id: MeasurementMode; label: string; icon: string }[] = [
  { id: "distance", label: "Distance", icon: "📏" },
  { id: "path", label: "Path", icon: "〰️" },
  { id: "polygon", label: "Area", icon: "⬡" },
  { id: "angle", label: "Angle", icon: "📐" },
];

const UNITS: DistanceUnit[] = ["m", "cm", "mm", "in", "ft", "yd"];

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function App() {
  const [mode, setMode] = useState<MeasurementMode>("distance");
  const [unit, setUnit] = useState<DistanceUnit>("m");
  const [angleUnit] = useState<AngleUnit>("deg");
  const [points, setPoints] = useState<Point3D[]>([]);
  const [history, setHistory] = useState<MeasurementRecord[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Virtual spatial crosshair depth (simulating camera distance in meters)
  const [targetDistance, setTargetDistance] = useState<number>(1.5);

  const triggerHaptic = useCallback(() => {
    if (Platform.OS === "ios") {
      Vibration.vibrate(10);
    } else {
      Vibration.vibrate(30);
    }
  }, []);

  // Drop point at current crosshair
  const handleDropPoint = useCallback(() => {
    triggerHaptic();

    // Generate 3D point anchored along view vector
    const angleOffset = (points.length * 45 * Math.PI) / 180;
    const newPoint: Point3D = {
      x: Math.sin(angleOffset) * targetDistance * 0.4,
      y: points.length % 2 === 0 ? 0 : 0.2,
      z: targetDistance,
    };

    setPoints((prev) => {
      if (mode === "distance" && prev.length >= 2) {
        return [newPoint];
      }
      if (mode === "angle" && prev.length >= 3) {
        return [newPoint];
      }
      return [...prev, newPoint];
    });
  }, [points.length, targetDistance, mode, triggerHaptic]);

  const handleUndo = useCallback(() => {
    triggerHaptic();
    setPoints((prev) => prev.slice(0, -1));
  }, [triggerHaptic]);

  const handleClear = useCallback(() => {
    triggerHaptic();
    setPoints([]);
  }, [triggerHaptic]);

  // Calculate live measurement
  let primaryValue = "0.00";
  let primaryUnit = unit;
  let primaryLabel = "Linear Distance";
  let isReadyToSave = false;

  const p0 = points[0];
  const p1 = points[1];
  const p2 = points[2];

  if (mode === "distance") {
    primaryLabel = "Distance (Point A → B)";
    if (p0 && p1) {
      const d = distance3D(p0, p1);
      primaryValue = formatDistance(d, unit, 2).split(" ")[0] ?? "0.00";
      primaryUnit = unit;
      isReadyToSave = true;
    }
  } else if (mode === "path") {
    primaryLabel = "Continuous Path Length";
    if (points.length >= 2) {
      const len = pathLength3D(points);
      primaryValue = formatDistance(len, unit, 2).split(" ")[0] ?? "0.00";
      primaryUnit = unit;
      isReadyToSave = true;
    }
  } else if (mode === "polygon") {
    primaryLabel = "Polygon Surface Area";
    if (points.length >= 3) {
      const area = polygonArea3D(points);
      primaryValue = formatArea(area, unit, 2).split(" ")[0] ?? "0.00";
      primaryUnit = `${unit}²` as any;
      isReadyToSave = true;
    }
  } else if (mode === "angle") {
    primaryLabel = "Angle at Vertex P2";
    if (p0 && p1 && p2) {
      const ang = angleBetween3D(p0, p1, p2, angleUnit);
      primaryValue = formatAngle(ang, angleUnit, 1).replace("°", "");
      primaryUnit = "°" as any;
      isReadyToSave = true;
    }
  }

  const handleSave = useCallback(() => {
    if (!isReadyToSave) return;
    triggerHaptic();

    let val = 0;
    let formatted = "";

    if (mode === "distance" && p0 && p1) {
      val = distance3D(p0, p1);
      formatted = formatDistance(val, unit, 2);
    } else if (mode === "path") {
      val = pathLength3D(points);
      formatted = formatDistance(val, unit, 2);
    } else if (mode === "polygon") {
      val = polygonArea3D(points);
      formatted = formatArea(val, unit, 2);
    } else if (mode === "angle" && p0 && p1 && p2) {
      val = angleBetween3D(p0, p1, p2, angleUnit);
      formatted = formatAngle(val, angleUnit, 1);
    }

    const record: MeasurementRecord = {
      id: Date.now().toString(36),
      timestamp: Date.now(),
      mode,
      value: val,
      unit: mode === "angle" ? angleUnit : unit,
      formatted,
      points: [...points],
    };

    setHistory((prev) => [record, ...prev]);
  }, [isReadyToSave, mode, p0, p1, p2, points, unit, angleUnit, triggerHaptic]);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>AR Ruler</Text>
          <Text style={styles.appSubtitle}>PlainOSS Spatial Measurement</Text>
        </View>
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => {
            triggerHaptic();
            setShowHistory((prev) => !prev);
          }}
          accessibilityLabel="Open Measurement History"
        >
          <Text style={styles.historyBtnText}>
            📋 {history.length > 0 ? `(${history.length})` : "History"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Mode Selector */}
      <View style={styles.modeRow}>
        {MODES.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={[styles.modeBtn, mode === m.id && styles.modeBtnActive]}
            onPress={() => {
              triggerHaptic();
              setMode(m.id);
            }}
          >
            <Text style={styles.modeIcon}>{m.icon}</Text>
            <Text
              style={[
                styles.modeLabel,
                mode === m.id && styles.modeLabelActive,
              ]}
            >
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Spatial Camera Viewfinder Simulator / Canvas */}
      <View style={styles.viewfinder}>
        {/* Spatial Grid Lines */}
        <View style={styles.gridOverlay}>
          <View style={styles.gridHLine} />
          <View style={styles.gridVLine} />
        </View>

        {/* Center Targeting Reticle */}
        <View style={styles.reticleContainer}>
          <View style={styles.reticleRing} />
          <View style={styles.reticleDot} />
          <Text style={styles.reticleDistance}>
            {formatDistance(targetDistance, unit, 1)}
          </Text>
        </View>

        {/* Placed Points Markers */}
        <View style={styles.pointsOverlay}>
          {points.map((p, idx) => (
            <View
              key={idx}
              style={[
                styles.pointMarker,
                {
                  left: SCREEN_WIDTH / 2 + p.x * 60 - 12,
                  top: 150 - p.y * 60,
                },
              ]}
            >
              <Text style={styles.pointMarkerText}>P{idx + 1}</Text>
            </View>
          ))}
        </View>

        {/* Distance Range Slider buttons */}
        <View style={styles.rangeControl}>
          <TouchableOpacity
            style={styles.rangeBtn}
            onPress={() =>
              setTargetDistance((d) =>
                Math.max(0.5, Number((d - 0.2).toFixed(1))),
              )
            }
          >
            <Text style={styles.rangeBtnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.rangeLabel}>Depth: {targetDistance}m</Text>
          <TouchableOpacity
            style={styles.rangeBtn}
            onPress={() =>
              setTargetDistance((d) =>
                Math.min(10, Number((d + 0.2).toFixed(1))),
              )
            }
          >
            <Text style={styles.rangeBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Primary Measurement HUD */}
      <View style={styles.hudCard}>
        <View style={styles.hudHeader}>
          <Text style={styles.hudPill}>{primaryLabel}</Text>
          <Text style={styles.hudPointsCount}>{points.length} points</Text>
        </View>

        <View style={styles.hudValueRow}>
          <Text style={styles.hudBigNumber}>{primaryValue}</Text>
          <Text style={styles.hudUnit}>{primaryUnit}</Text>
        </View>

        {mode === "polygon" && points.length >= 3 && (
          <Text style={styles.hudSubInfo}>
            Perimeter: {formatDistance(perimeter3D(points), unit)}
          </Text>
        )}
      </View>

      {/* Unit Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.unitsScroll}
      >
        {UNITS.map((u) => (
          <TouchableOpacity
            key={u}
            style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
            onPress={() => {
              triggerHaptic();
              setUnit(u);
            }}
          >
            <Text
              style={[
                styles.unitBtnText,
                unit === u && styles.unitBtnTextActive,
              ]}
            >
              {u}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bottom Action Controls */}
      <View style={styles.bottomControls}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnSecondary]}
          onPress={handleUndo}
          disabled={points.length === 0}
        >
          <Text style={styles.actionBtnText}>↩️ Undo</Text>
        </TouchableOpacity>

        {/* Primary Point Placement Trigger */}
        <TouchableOpacity
          style={styles.dropPointBtn}
          onPress={handleDropPoint}
          activeOpacity={0.7}
        >
          <View style={styles.dropPointInner}>
            <Text style={styles.dropPointText}>📍</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionBtn,
            isReadyToSave ? styles.actionBtnSave : styles.actionBtnSecondary,
          ]}
          onPress={isReadyToSave ? handleSave : handleClear}
        >
          <Text style={styles.actionBtnText}>
            {isReadyToSave ? "💾 Save" : "🗑️ Clear"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* History Drawer Modal */}
      {showHistory && (
        <View style={styles.historyModalBackdrop}>
          <View style={styles.historyModalContent}>
            <View style={styles.historyModalHeader}>
              <Text style={styles.historyModalTitle}>Saved Measurements</Text>
              <TouchableOpacity
                onPress={() => setShowHistory(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.historyList}>
              {history.length === 0 ? (
                <Text style={styles.emptyHistoryText}>
                  No saved measurements yet.
                </Text>
              ) : (
                history.map((rec) => (
                  <View key={rec.id} style={styles.historyItem}>
                    <View style={styles.historyItemHeader}>
                      <Text style={styles.historyItemTag}>
                        {rec.mode.toUpperCase()}
                      </Text>
                      <Text style={styles.historyItemTime}>
                        {new Date(rec.timestamp).toLocaleTimeString()}
                      </Text>
                    </View>
                    <Text style={styles.historyItemValue}>{rec.formatted}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  appTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f8fafc",
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
  },
  historyBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  historyBtnText: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "600",
  },
  modeRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  modeBtnActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
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
  },
  viewfinder: {
    flex: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: "#121216",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  gridOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
  },
  gridHLine: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  gridVLine: {
    width: 1,
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    position: "absolute",
  },
  reticleContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  reticleRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#3b82f6",
    borderStyle: "dashed",
  },
  reticleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#60a5fa",
    position: "absolute",
  },
  reticleDistance: {
    color: "#60a5fa",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pointsOverlay: {
    ...StyleSheet.absoluteFill,
  },
  pointMarker: {
    position: "absolute",
    backgroundColor: "#3b82f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  pointMarkerText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  rangeControl: {
    position: "absolute",
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 8,
  },
  rangeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  rangeBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  rangeLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  hudCard: {
    marginHorizontal: 16,
    backgroundColor: "#16161c",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 14,
    padding: 14,
  },
  hudHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  hudPill: {
    color: "#3b82f6",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  hudPointsCount: {
    color: "#64748b",
    fontSize: 11,
  },
  hudValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  hudBigNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: "#f8fafc",
    letterSpacing: -0.5,
  },
  hudUnit: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3b82f6",
  },
  hudSubInfo: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 4,
  },
  unitsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  unitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  unitBtnActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  unitBtnText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
  unitBtnTextActive: {
    color: "#ffffff",
  },
  bottomControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 84,
    alignItems: "center",
  },
  actionBtnSecondary: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  actionBtnSave: {
    backgroundColor: "#10b981",
  },
  actionBtnText: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
  },
  dropPointBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(59, 130, 246, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#3b82f6",
  },
  dropPointInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
  },
  dropPointText: {
    fontSize: 24,
  },
  historyModalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
    zIndex: 100,
  },
  historyModalContent: {
    backgroundColor: "#141418",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "70%",
  },
  historyModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  historyModalTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: "#94a3b8",
    fontSize: 18,
    fontWeight: "700",
  },
  historyList: {
    maxHeight: 320,
  },
  emptyHistoryText: {
    color: "#64748b",
    textAlign: "center",
    marginVertical: 24,
  },
  historyItem: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  historyItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  historyItemTag: {
    color: "#3b82f6",
    fontSize: 11,
    fontWeight: "700",
  },
  historyItemTime: {
    color: "#64748b",
    fontSize: 11,
  },
  historyItemValue: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "700",
  },
});
