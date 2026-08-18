import { useState, useCallback, useRef } from "react";
import {
  Point3D,
  DistanceUnit,
  distance3D,
  formatDistance,
} from "@plainoss/core";
import { ViroTrackingState } from "../ar/types";
import { ToastMessage } from "../components/Toast";
import { useHaptics } from "./useHaptics";

export function useARRuler() {
  const [points, setPoints] = useState<Point3D[]>([]);
  const [unit, setUnit] = useState<DistanceUnit>("m");
  const [draggedHandleIndex, setDraggedHandleIndex] = useState<number | null>(
    null,
  );
  const [hoveredHandleIndex, setHoveredHandleIndex] = useState<number | null>(
    null,
  );
  const [reticlePos, setReticlePos] = useState<Point3D | null>(null);
  const [trackingState, setTrackingState] =
    useState<ViroTrackingState>("NORMAL");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const { impactHaptic, successHaptic, selectionHaptic } = useHaptics();

  const showToast = useCallback(
    (text: string, type: "info" | "success" | "warning" = "info") => {
      const id = Date.now().toString() + Math.random().toString(36).slice(2, 5);
      setToasts((prev) => [...prev, { id, text, type }]);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const unitRef = useRef<DistanceUnit>(unit);
  unitRef.current = unit;

  // Handle Point Placement
  const handlePointPlaced = useCallback(
    (pt: Point3D) => {
      impactHaptic("medium");
      setPoints((prev) => {
        if (prev.length >= 2) {
          showToast("Point 1 placed. Aim at Point 2 & tap", "info");
          return [pt];
        } else if (prev.length === 1) {
          const first = prev[0];
          if (first) {
            const dist = distance3D(first, pt);
            successHaptic();
            showToast(
              `Distance: ${formatDistance(dist, unitRef.current, 2)}`,
              "success",
            );
          }
          return [...prev, pt];
        } else {
          showToast("Point 1 placed. Aim at Point 2 & tap", "info");
          return [pt];
        }
      });
    },
    [impactHaptic, successHaptic, showToast],
  );

  // Handle Grabbing Existing Point Handle
  const handleHandleGrabbed = useCallback(
    (index: number) => {
      impactHaptic("heavy");
      setDraggedHandleIndex(index);
      showToast(`Moving Point ${index + 1}. Aim & tap to lock`, "info");
    },
    [impactHaptic, showToast],
  );

  // Handle Moving Handle in Real Time
  const handleHandleMoved = useCallback((index: number, newPos: Point3D) => {
    setPoints((prev) => {
      const next = [...prev];
      next[index] = newPos;
      return next;
    });
  }, []);

  // Handle Dropping and Locking Handle
  const handleHandleDropped = useCallback(
    (index: number, newPos: Point3D) => {
      impactHaptic("medium");
      setDraggedHandleIndex(null);
      setPoints((prev) => {
        const next = [...prev];
        next[index] = newPos;
        if (next.length >= 2 && next[0] && next[1]) {
          const dist = distance3D(next[0], next[1]);
          successHaptic();
          showToast(
            `Updated Distance: ${formatDistance(dist, unitRef.current, 2)}`,
            "success",
          );
        }
        return next;
      });
    },
    [impactHaptic, successHaptic, showToast],
  );

  // Handle Reset / Clear
  const handleReset = useCallback(() => {
    impactHaptic("light");
    setPoints([]);
    setDraggedHandleIndex(null);
    setHoveredHandleIndex(null);
    showToast("Measurement cleared", "info");
  }, [impactHaptic, showToast]);

  // Handle Unit Change
  const handleSelectUnit = useCallback(
    (newUnit: DistanceUnit) => {
      selectionHaptic();
      setUnit(newUnit);
      showToast(`Unit: ${newUnit.toUpperCase()}`, "info");
    },
    [selectionHaptic, showToast],
  );

  // Update reticle position & evaluate handle proximity hover
  const handleReticlePositionUpdate = useCallback(
    (pos: Point3D | null) => {
      setReticlePos(pos);
      if (!pos || draggedHandleIndex !== null || points.length === 0) {
        setHoveredHandleIndex(null);
        return;
      }

      let closestIdx: number | null = null;
      let minD = 0.12; // 12cm proximity threshold

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (p) {
          const d = distance3D(p, pos);
          if (d < minD) {
            minD = d;
            closestIdx = i;
          }
        }
      }

      setHoveredHandleIndex(closestIdx);
    },
    [draggedHandleIndex, points],
  );

  const handleTrackingStateChange = useCallback((state: ViroTrackingState) => {
    setTrackingState(state);
  }, []);

  return {
    points,
    unit,
    draggedHandleIndex,
    hoveredHandleIndex,
    reticlePos,
    trackingState,
    isScanning: trackingState !== "NORMAL" && reticlePos === null,
    toasts,
    showToast,
    dismissToast,
    handlePointPlaced,
    handleHandleGrabbed,
    handleHandleMoved,
    handleHandleDropped,
    handleReset,
    handleSelectUnit,
    handleReticlePositionUpdate,
    handleTrackingStateChange,
  };
}
