/**
 * AR Ruler 3D Geometry Engine
 * 100% pure TypeScript 3D Euclidean calculation routines.
 */

import { AngleUnit, BoundingBox3D, Point3D, Vector3D } from "./types";

/**
 * Calculates the Euclidean distance between two 3D points.
 * d = sqrt((x2 - x1)^2 + (y2 - y1)^2 + (z2 - z1)^2)
 */
export function distance3D(p1: Point3D, p2: Point3D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculates the total length along a sequence of continuous 3D points.
 */
export function pathLength3D(points: Point3D[]): number {
  if (!points || points.length < 2) {
    return 0;
  }
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    if (current && next) {
      total += distance3D(current, next);
    }
  }
  return total;
}

/**
 * Calculates the perimeter of a closed loop of 3D points.
 */
export function perimeter3D(points: Point3D[]): number {
  if (!points || points.length < 2) {
    return 0;
  }
  const first = points[0];
  const second = points[1];
  if (!first || !second) {
    return 0;
  }
  if (points.length === 2) {
    return distance3D(first, second) * 2;
  }
  let total = pathLength3D(points);
  const last = points[points.length - 1];
  if (last) {
    total += distance3D(last, first);
  }
  return total;
}

/**
 * Calculates the surface area of a planar 3D polygon using Newell's Method.
 * Accurately calculates area for any planar 3D polygon in any orientation.
 */
export function polygonArea3D(points: Point3D[]): number {
  if (!points || points.length < 3) {
    return 0;
  }

  const n = points.length;
  let nx = 0;
  let ny = 0;
  let nz = 0;

  for (let i = 0; i < n; i++) {
    const current = points[i];
    const next = points[(i + 1) % n];

    if (current && next) {
      nx += (current.y - next.y) * (current.z + next.z);
      ny += (current.z - next.z) * (current.x + next.x);
      nz += (current.x - next.x) * (current.y + next.y);
    }
  }

  // Halve and compute magnitude of the normal vector
  const normalMagnitude = Math.sqrt(nx * nx + ny * ny + nz * nz) / 2;
  return Number.isFinite(normalMagnitude) ? normalMagnitude : 0;
}

/**
 * Calculates the angle formed by three points (A -> B -> C), with apex at point B.
 * Returns angle in degrees [0, 180] or radians [0, π].
 */
export function angleBetween3D(
  a: Point3D,
  b: Point3D,
  c: Point3D,
  unit: AngleUnit = "deg",
): number {
  const v1: Vector3D = {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
  const v2: Vector3D = {
    x: c.x - b.x,
    y: c.y - b.y,
    z: c.z - b.z,
  };

  const mag1 = vectorMagnitude3D(v1);
  const mag2 = vectorMagnitude3D(v2);

  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }

  const dot = dotProduct3D(v1, v2);
  const cosine = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  const rad = Math.acos(cosine);

  return unit === "deg" ? (rad * 180) / Math.PI : rad;
}

/**
 * Vector subtraction: a - b
 */
export function vectorSubtract(
  a: Point3D | Vector3D,
  b: Point3D | Vector3D,
): Vector3D {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}

/**
 * Vector addition: a + b
 */
export function vectorAdd(a: Point3D | Vector3D, b: Vector3D): Point3D {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

/**
 * Vector scaling: v * scale
 */
export function vectorScale(v: Vector3D, scale: number): Vector3D {
  return {
    x: v.x * scale,
    y: v.y * scale,
    z: v.z * scale,
  };
}

/**
 * Vector Dot Product
 */
export function dotProduct3D(a: Vector3D, b: Vector3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Vector Cross Product: a x b
 */
export function crossProduct3D(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

/**
 * Magnitude (length) of a 3D vector
 */
export function vectorMagnitude3D(v: Vector3D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/**
 * Normalize a 3D vector to unit length
 */
export function vectorNormalize3D(v: Vector3D): Vector3D {
  const mag = vectorMagnitude3D(v);
  if (mag === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  return {
    x: v.x / mag,
    y: v.y / mag,
    z: v.z / mag,
  };
}

/**
 * Finds the midpoint between two 3D points.
 */
export function midpoint3D(a: Point3D, b: Point3D): Point3D {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  };
}

/**
 * Calculates the geometric centroid (average point) of a set of 3D points.
 */
export function centroid3D(points: Point3D[]): Point3D {
  if (!points || points.length === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  let sx = 0;
  let sy = 0;
  let sz = 0;
  let count = 0;
  for (const p of points) {
    if (p) {
      sx += p.x;
      sy += p.y;
      sz += p.z;
      count++;
    }
  }
  if (count === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  return {
    x: sx / count,
    y: sy / count,
    z: sz / count,
  };
}

/**
 * Computes axis-aligned bounding box for a set of 3D points.
 */
export function boundingBox3D(points: Point3D[]): BoundingBox3D {
  const zero: Point3D = { x: 0, y: 0, z: 0 };
  if (!points || points.length === 0) {
    return { min: zero, max: zero, dimensions: zero };
  }

  const p0 = points[0];
  if (!p0) {
    return { min: zero, max: zero, dimensions: zero };
  }

  let minX = p0.x;
  let minY = p0.y;
  let minZ = p0.z;
  let maxX = p0.x;
  let maxY = p0.y;
  let maxZ = p0.z;

  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.z < minZ) minZ = p.z;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
      if (p.z > maxZ) maxZ = p.z;
    }
  }

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
    dimensions: {
      x: maxX - minX,
      y: maxY - minY,
      z: maxZ - minZ,
    },
  };
}
