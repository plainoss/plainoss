import { useState, useCallback, useMemo } from "react";
import {
  Point3D,
  DistanceUnit,
  AngleUnit,
  distance3D,
  pathLength3D,
  perimeter3D,
  polygonArea3D,
  angleBetween3D,
  formatDistance,
  formatArea,
  formatAngle,
} from "@plainoss/core";
import {
  ExtendedMeasurementMode,
  MobileMeasurementRecord,
  DeviceOrientationState,
} from "../types/app";
import {
  hapticImpactLight,
  hapticImpactMedium,
  hapticSuccess,
} from "../utils/haptics";

interface UseARMeasurementProps {
  orientation: DeviceOrientationState;
  hapticsEnabled?: boolean;
}

export function useARMeasurement({
  orientation,
  hapticsEnabled = true,
}: UseARMeasurementProps) {
  const [mode, setMode] = useState<ExtendedMeasurementMode>("distance");
  const [unit, setUnit] = useState<DistanceUnit>("m");
  const [angleUnit, setAngleUnit] = useState<AngleUnit>("deg");
  const [targetDistance, setTargetDistance] = useState<number>(1.5);
  const [points, setPoints] = useState<Point3D[]>([]);

  // Change mode
  const handleSetMode = useCallback(
    (newMode: ExtendedMeasurementMode) => {
      hapticImpactLight(hapticsEnabled);
      setMode(newMode);
      setPoints([]);
    },
    [hapticsEnabled],
  );

  // Change unit
  const handleSetUnit = useCallback(
    (newUnit: DistanceUnit) => {
      hapticImpactLight(hapticsEnabled);
      setUnit(newUnit);
    },
    [hapticsEnabled],
  );

  // Change angle unit
  const handleSetAngleUnit = useCallback(
    (newAngleUnit: AngleUnit) => {
      hapticImpactLight(hapticsEnabled);
      setAngleUnit(newAngleUnit);
    },
    [hapticsEnabled],
  );

  // Adjust depth
  const handleSetTargetDistance = useCallback(
    (dist: number | ((prev: number) => number)) => {
      setTargetDistance((prev) => {
        const next = typeof dist === "function" ? dist(prev) : dist;
        return Math.max(0.3, Math.min(15.0, Number(next.toFixed(2))));
      });
    },
    [],
  );

  // Drop point at current reticle aim
  const dropPoint = useCallback(() => {
    hapticImpactMedium(hapticsEnabled);

    // Compute point in 3D camera coordinates
    // When aiming, target is placed straight along forward Z with slight distribution based on count for simulation
    const angleOffset = (points.length * 45 * Math.PI) / 180;
    const spreadX = Math.sin(angleOffset) * targetDistance * 0.35;
    const spreadY =
      (points.length % 2 === 0 ? 0.1 : -0.1) * targetDistance * 0.3;

    const newPoint: Point3D = {
      x: spreadX,
      y: spreadY,
      z: targetDistance,
    };

    setPoints((prev) => {
      if (mode === "distance" && prev.length >= 2) {
        return [newPoint];
      }
      if (mode === "angle" && prev.length >= 3) {
        return [newPoint];
      }
      if (mode === "height" && prev.length >= 2) {
        return [newPoint];
      }
      return [...prev, newPoint];
    });
  }, [points.length, targetDistance, mode, hapticsEnabled]);

  const undoPoint = useCallback(() => {
    hapticImpactLight(hapticsEnabled);
    setPoints((prev) => prev.slice(0, -1));
  }, [hapticsEnabled]);

  const clearPoints = useCallback(() => {
    hapticImpactLight(hapticsEnabled);
    setPoints([]);
  }, [hapticsEnabled]);

  // Derived calculations
  const calculation = useMemo(() => {
    let primaryValue: string = "0.00";
    let primaryUnitStr: string = unit;
    let title: string = "Linear Distance";
    let isReady: boolean = false;
    let numericVal: number = 0;
    let formattedText: string = "";
    let secondary: MobileMeasurementRecord["secondaryMetrics"] = undefined;

    const p0 = points[0];
    const p1 = points[1];
    const p2 = points[2];

    if (mode === "distance") {
      title = "Point-to-Point Distance";
      if (p0 && p1) {
        numericVal = distance3D(p0, p1);
        formattedText = formatDistance(numericVal, unit, 2);
        primaryValue = formattedText.split(" ")[0] ?? "0.00";
        primaryUnitStr = unit;
        isReady = true;

        secondary = {
          deltaX: formatDistance(Math.abs(p1.x - p0.x), unit, 2),
          deltaY: formatDistance(Math.abs(p1.y - p0.y), unit, 2),
          deltaZ: formatDistance(Math.abs(p1.z - p0.z), unit, 2),
        };
      }
    } else if (mode === "path") {
      title = `Path (${points.length} points)`;
      if (points.length >= 2) {
        numericVal = pathLength3D(points);
        formattedText = formatDistance(numericVal, unit, 2);
        primaryValue = formattedText.split(" ")[0] ?? "0.00";
        primaryUnitStr = unit;
        isReady = true;
      }
    } else if (mode === "polygon") {
      title = `Surface Area (${points.length} vertices)`;
      if (points.length >= 3) {
        numericVal = polygonArea3D(points);
        formattedText = formatArea(numericVal, unit, 2);
        primaryValue = formattedText.split(" ")[0] ?? "0.00";
        primaryUnitStr = `${unit}²`;
        isReady = true;

        const peri = perimeter3D(points);
        secondary = {
          perimeter: formatDistance(peri, unit, 2),
        };
      }
    } else if (mode === "angle") {
      title = "Vertex Angle (P1 → P2 → P3)";
      if (p0 && p1 && p2) {
        numericVal = angleBetween3D(p0, p1, p2, angleUnit);
        formattedText = formatAngle(numericVal, angleUnit, 1);
        primaryValue = formattedText.replace("°", "").replace(" rad", "");
        primaryUnitStr = angleUnit === "deg" ? "°" : "rad";
        isReady = true;
      }
    } else if (mode === "height") {
      title = "Vertical Elevation (Height)";
      if (p0 && p1) {
        numericVal = Math.abs(p1.y - p0.y);
        formattedText = formatDistance(numericVal, unit, 2);
        primaryValue = formattedText.split(" ")[0] ?? "0.00";
        primaryUnitStr = unit;
        isReady = true;
        secondary = {
          deltaY: formattedText,
        };
      }
    } else if (mode === "level") {
      title = "Digital Spirit Level";
      numericVal = Math.abs(orientation.roll);
      formattedText = `${orientation.roll.toFixed(1)}° Roll / ${orientation.pitch.toFixed(1)}° Pitch`;
      primaryValue = Math.abs(orientation.roll).toFixed(1);
      primaryUnitStr = "°";
      isReady = true;
      secondary = {
        pitch: orientation.pitch,
        roll: orientation.roll,
      };
    }

    return {
      title,
      primaryValue,
      primaryUnitStr,
      isReady,
      numericVal,
      formattedText,
      secondary,
    };
  }, [mode, points, unit, angleUnit, orientation]);

  // Construct a record ready to be saved
  const createCurrentRecord =
    useCallback((): MobileMeasurementRecord | null => {
      if (!calculation.isReady && mode !== "level") return null;
      hapticSuccess(hapticsEnabled);

      return {
        id:
          Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        timestamp: Date.now(),
        mode,
        value: calculation.numericVal,
        unit: mode === "angle" ? angleUnit : mode === "level" ? "deg" : unit,
        formatted: calculation.formattedText,
        points: [...points],
        secondaryMetrics: calculation.secondary,
      };
    }, [calculation, mode, angleUnit, unit, points, hapticsEnabled]);

  return {
    mode,
    setMode: handleSetMode,
    unit,
    setUnit: handleSetUnit,
    angleUnit,
    setAngleUnit: handleSetAngleUnit,
    targetDistance,
    setTargetDistance: handleSetTargetDistance,
    points,
    dropPoint,
    undoPoint,
    clearPoints,
    calculation,
    createCurrentRecord,
  };
}
