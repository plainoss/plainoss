import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { THEME } from "../theme/colors";

interface ReticleProps {
  isScanning: boolean;
  isHoveringHandle: boolean;
  isDraggingHandle: boolean;
}

export function Reticle({
  isScanning,
  isHoveringHandle,
  isDraggingHandle,
}: ReticleProps) {
  const activeColor = isDraggingHandle
    ? THEME.accentGreen
    : isHoveringHandle
      ? THEME.accentGold
      : THEME.accentCyan;

  return (
    <View style={styles.container} pointerEvents="none">
      {isScanning ? (
        <Svg width={64} height={64} viewBox="0 0 64 64">
          {/* Scanning Outer Guidance Ring */}
          <Circle
            cx="32"
            cy="32"
            r="26"
            stroke={THEME.accentCyan}
            strokeWidth="2"
            fill="none"
            strokeDasharray="6, 4"
            opacity={0.8}
          />
          <Circle cx="32" cy="32" r="3" fill={THEME.accentCyan} />
        </Svg>
      ) : (
        <Svg width={24} height={24} viewBox="0 0 24 24">
          {/* Precision Center Micro-Dot */}
          <Circle cx="12" cy="12" r="2.5" fill={activeColor} opacity={0.85} />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
});
