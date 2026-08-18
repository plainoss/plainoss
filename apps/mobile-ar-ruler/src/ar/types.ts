import { Point3D, DistanceUnit } from "@plainoss/core";

export type ViroTrackingState = "NORMAL" | "LIMITED" | "UNAVAILABLE";

export interface ARRulerSceneProps {
  points: Point3D[];
  unit: DistanceUnit;
  draggedHandleIndex: number | null;
  hoveredHandleIndex: number | null;
  onPointPlaced: (point: Point3D) => void;
  onHandleGrabbed: (index: number) => void;
  onHandleMoved: (index: number, newPos: Point3D) => void;
  onHandleDropped: (index: number, newPos: Point3D) => void;
  onTrackingStateChange: (state: ViroTrackingState) => void;
  onReticlePositionUpdate: (pos: Point3D | null) => void;
}
