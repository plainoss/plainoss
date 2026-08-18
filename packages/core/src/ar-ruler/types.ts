/**
 * AR Ruler Core Types & Interfaces
 * Pure 3D geometry types and measurement configurations.
 */

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox3D {
  min: Point3D;
  max: Point3D;
  dimensions: Vector3D;
}

export type DistanceUnit = "mm" | "cm" | "m" | "in" | "ft" | "yd";

export type AreaUnit = "mm²" | "cm²" | "m²" | "in²" | "ft²" | "yd²";

export type AngleUnit = "deg" | "rad";

export type MeasurementMode = "distance" | "path" | "polygon" | "angle";

export interface MeasurementRecord {
  id: string;
  timestamp: number;
  mode: MeasurementMode;
  value: number;
  unit: DistanceUnit | AngleUnit;
  formatted: string;
  points: Point3D[];
  label?: string;
}
