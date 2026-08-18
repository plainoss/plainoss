import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { THEME } from "../theme/colors";

interface ReticleProps {
  isHoveringHandle: boolean;
  isDraggingHandle: boolean;
}

export function Reticle({ isHoveringHandle, isDraggingHandle }: ReticleProps) {
  const activeColor = isDraggingHandle
    ? THEME.accentGreen
    : isHoveringHandle
      ? THEME.accentGold
      : THEME.accentCyan;

  return (
    <View style={styles.container} pointerEvents="none">
      <Svg width={64} height={64} viewBox="0 0 64 64">
        {/* Outer Ring */}
        <Circle
          cx="32"
          cy="32"
          r="26"
          stroke={activeColor}
          strokeWidth="2.5"
          fill="none"
          strokeDasharray={isHoveringHandle ? "6, 4" : undefined}
          opacity={0.9}
        />
        {/* Center Target Dot */}
        <Circle cx="32" cy="32" r="3.5" fill={activeColor} />
      </Svg>
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
