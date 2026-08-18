import { Point3D, DistanceUnit, AngleUnit } from "@plainoss/core";

export type ExtendedMeasurementMode =
  | "distance"
  | "path"
  | "polygon"
  | "angle"
  | "height"
  | "level";

export interface MobileMeasurementRecord {
  id: string;
  title?: string;
  timestamp: number;
  mode: ExtendedMeasurementMode;
  value: number;
  unit: string;
  formatted: string;
  points: Point3D[];
  secondaryMetrics?: {
    perimeter?: string;
    deltaX?: string;
    deltaY?: string;
    deltaZ?: string;
    pitch?: number;
    roll?: number;
  };
}

export interface AppSettings {
  precision: number;
  defaultUnit: DistanceUnit;
  defaultAngleUnit: AngleUnit;
  hapticsEnabled: boolean;
  gridEnabled: boolean;
  torchDefault: boolean;
}

export interface DeviceOrientationState {
  pitch: number; // in degrees (-90 to +90)
  roll: number; // in degrees (-180 to +180)
  isLevel: boolean; // within tolerance
  isVertical: boolean;
}
