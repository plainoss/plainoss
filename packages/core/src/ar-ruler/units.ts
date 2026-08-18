/**
 * AR Ruler Units & Formatting Engine
 * Unit conversions and display formatting for lengths, areas, and angles.
 */

import { AngleUnit, AreaUnit, DistanceUnit } from "./types";

// Conversion factors to base SI meters
export const METERS_PER_UNIT: Record<DistanceUnit, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1.0,
  in: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
};

export const AREA_UNIT_SYMBOLS: Record<DistanceUnit, AreaUnit> = {
  mm: "mm²",
  cm: "cm²",
  m: "m²",
  in: "in²",
  ft: "ft²",
  yd: "yd²",
};

/**
 * Converts a distance from one unit to another.
 */
export function convertDistance(
  value: number,
  fromUnit: DistanceUnit,
  toUnit: DistanceUnit,
): number {
  if (fromUnit === toUnit) {
    return value;
  }
  const inMeters = value * METERS_PER_UNIT[fromUnit];
  return inMeters / METERS_PER_UNIT[toUnit];
}

/**
 * Converts an area from square meters to the target unit's square representation.
 */
export function convertAreaFromMeters(
  areaInSquareMeters: number,
  toDistanceUnit: DistanceUnit,
): number {
  const factor = METERS_PER_UNIT[toDistanceUnit];
  return areaInSquareMeters / (factor * factor);
}

/**
 * Converts an area between two distance units.
 */
export function convertArea(
  value: number,
  fromDistanceUnit: DistanceUnit,
  toDistanceUnit: DistanceUnit,
): number {
  if (fromDistanceUnit === toDistanceUnit) {
    return value;
  }
  const fromFactor = METERS_PER_UNIT[fromDistanceUnit];
  const toFactor = METERS_PER_UNIT[toDistanceUnit];
  const inSquareMeters = value * (fromFactor * fromFactor);
  return inSquareMeters / (toFactor * toFactor);
}

/**
 * Converts an angle between degrees and radians.
 */
export function convertAngle(
  value: number,
  from: AngleUnit,
  to: AngleUnit,
): number {
  if (from === to) {
    return value;
  }
  if (from === "deg" && to === "rad") {
    return (value * Math.PI) / 180;
  }
  return (value * 180) / Math.PI;
}

/**
 * Formats a distance (given in meters) to a human-readable string.
 */
export function formatDistance(
  valueInMeters: number,
  targetUnit: DistanceUnit,
  decimals: number = 2,
): string {
  const converted = convertDistance(valueInMeters, "m", targetUnit);
  const rounded = Number(converted.toFixed(decimals));
  return `${rounded} ${targetUnit}`;
}

/**
 * Formats an area (given in square meters) to a human-readable string.
 */
export function formatArea(
  areaInSquareMeters: number,
  targetUnit: DistanceUnit,
  decimals: number = 2,
): string {
  const converted = convertAreaFromMeters(areaInSquareMeters, targetUnit);
  const rounded = Number(converted.toFixed(decimals));
  const symbol = AREA_UNIT_SYMBOLS[targetUnit] || `${targetUnit}²`;
  return `${rounded} ${symbol}`;
}

/**
 * Formats an angle to a human-readable string.
 */
export function formatAngle(
  angleInDegrees: number,
  unit: AngleUnit = "deg",
  decimals: number = 1,
): string {
  if (unit === "rad") {
    const rad = convertAngle(angleInDegrees, "deg", "rad");
    return `${Number(rad.toFixed(decimals + 1))} rad`;
  }
  return `${Number(angleInDegrees.toFixed(decimals))}°`;
}
