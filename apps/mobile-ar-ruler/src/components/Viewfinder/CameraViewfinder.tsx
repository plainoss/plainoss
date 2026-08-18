import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, LayoutChangeEvent } from "react-native";
import { CameraView, CameraType } from "expo-camera";
import { Point3D, DistanceUnit } from "@plainoss/core";
import { ExtendedMeasurementMode } from "../../types/app";
import { SpatialReticle } from "./SpatialReticle";
import { PointsOverlay } from "./PointsOverlay";
import { DepthSlider } from "./DepthSlider";

interface CameraViewfinderProps {
  hasPermission: boolean;
  canRequest: boolean;
  onRequestPermission: () => void;
  torch: boolean;
  facing: CameraType;
  points: Point3D[];
  mode: ExtendedMeasurementMode;
  unit: DistanceUnit;
  targetDistance: number;
  onChangeDistance: (dist: number | ((prev: number) => number)) => void;
  isLevel: boolean;
  isVertical: boolean;
  gridEnabled: boolean;
}

export const CameraViewfinder: React.FC<CameraViewfinderProps> = ({
  hasPermission,
  canRequest,
  onRequestPermission,
  torch,
  facing,
  points,
  mode,
  unit,
  targetDistance,
  onChangeDistance,
  isLevel,
  isVertical,
  gridEnabled,
}) => {
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setDimensions({ width, height });
  };

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {hasPermission ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing={facing}
          enableTorch={torch}
        />
      ) : (
        <View style={styles.simulatedContainer}>
          {/* Simulated 3D grid perspective */}
          <View style={styles.gridLines}>
            <View style={styles.hLine1} />
            <View style={styles.hLine2} />
            <View style={styles.vLine1} />
            <View style={styles.vLine2} />
          </View>

          {/* Camera Access prompt pill */}
          <View style={styles.permissionPill}>
            <Text style={styles.permissionPillText}>📷 Viewfinder Simulator</Text>
            {canRequest && (
              <TouchableOpacity
                style={styles.permissionBtn}
                onPress={onRequestPermission}
              >
                <Text style={styles.permissionBtnText}>Enable Camera</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Grid Guidelines overlay */}
      {gridEnabled && (
        <View style={styles.gridOverlay} pointerEvents="none">
          <View style={styles.gridThirdH1} />
          <View style={styles.gridThirdH2} />
          <View style={styles.gridThirdV1} />
          <View style={styles.gridThirdV2} />
        </View>
      )}

      {/* SVG Points and Lines Overlay */}
      <PointsOverlay
        points={points}
        mode={mode}
        unit={unit}
        viewWidth={dimensions.width}
        viewHeight={dimensions.height}
      />

      {/* Central Targeting Reticle */}
      <SpatialReticle
        targetDistance={targetDistance}
        unit={unit}
        isLevel={isLevel}
        isVertical={isVertical}
      />

      {/* Depth Slider & Presets */}
      <DepthSlider
        targetDistance={targetDistance}
        unit={unit}
        onChangeDistance={onChangeDistance}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#0d0d12",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    position: "relative",
  },
  simulatedContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#111116",
    justifyContent: "center",
    alignItems: "center",
  },
  gridLines: {
    ...StyleSheet.absoluteFillObject,
  },
  hLine1: {
    position: "absolute",
    top: "33%",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  hLine2: {
    position: "absolute",
    top: "66%",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  vLine1: {
    position: "absolute",
    left: "33%",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  vLine2: {
    position: "absolute",
    left: "66%",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridThirdH1: {
    position: "absolute",
    top: "33.3%",
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  gridThirdH2: {
    position: "absolute",
    top: "66.6%",
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  gridThirdV1: {
    position: "absolute",
    left: "33.3%",
    height: "100%",
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  gridThirdV2: {
    position: "absolute",
    left: "66.6%",
    height: "100%",
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  permissionPill: {
    position: "absolute",
    top: 14,
    backgroundColor: "rgba(10, 10, 14, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  permissionPillText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
  },
  permissionBtn: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  permissionBtnText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
});
