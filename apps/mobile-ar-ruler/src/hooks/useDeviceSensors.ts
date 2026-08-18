import { useState, useEffect } from "react";
import { Platform } from "react-native";
import { Accelerometer } from "expo-sensors";
import { DeviceOrientationState } from "../types/app";

const LEVEL_TOLERANCE_DEG = 1.5;

export function useDeviceSensors(): DeviceOrientationState {
  const [orientation, setOrientation] = useState<DeviceOrientationState>({
    pitch: 0,
    roll: 0,
    isLevel: true,
    isVertical: false,
  });

  useEffect(() => {
    if (Platform.OS === "web") return;

    Accelerometer.setUpdateInterval(100);

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      // Calculate pitch (tilt forward/backward) and roll (tilt side to side) in degrees
      // Normalized gravity vector: sqrt(x^2 + y^2 + z^2) approx 1g
      const rollRad = Math.atan2(x, Math.sqrt(y * y + z * z));
      const pitchRad = Math.atan2(-y, Math.sqrt(x * x + z * z));

      const rollDeg = Number(((rollRad * 180) / Math.PI).toFixed(1));
      const pitchDeg = Number(((pitchRad * 180) / Math.PI).toFixed(1));

      // Level if phone is parallel to ground (roll near 0 and pitch near 0) or standing upright (pitch near -90 or 90)
      const isLevel =
        (Math.abs(rollDeg) <= LEVEL_TOLERANCE_DEG &&
          Math.abs(pitchDeg) <= LEVEL_TOLERANCE_DEG) ||
        (Math.abs(rollDeg) <= LEVEL_TOLERANCE_DEG &&
          Math.abs(Math.abs(pitchDeg) - 90) <= LEVEL_TOLERANCE_DEG);

      const isVertical = Math.abs(Math.abs(pitchDeg) - 90) <= 5.0;

      setOrientation({
        pitch: pitchDeg,
        roll: rollDeg,
        isLevel,
        isVertical,
      });
    });

    return () => {
      subscription && subscription.remove();
    };
  }, []);

  return orientation;
}
