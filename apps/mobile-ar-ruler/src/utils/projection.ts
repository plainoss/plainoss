import { Point3D } from "@plainoss/core";

export interface ProjectedPoint {
  x: number;
  y: number;
  scale: number;
  visible: boolean;
}

/**
 * Projects a 3D point (meters in camera local space) to 2D screen coordinates.
 * x: right (+), y: up (+), z: forward/depth (+ in front of camera)
 */
export const project3DtoScreen = (
  p: Point3D,
  viewWidth: number,
  viewHeight: number,
  cameraFov: number = 60 // degrees vertical FOV
): ProjectedPoint => {
  const fovRad = (cameraFov * Math.PI) / 180;
  const focalLength = (viewHeight / 2) / Math.tan(fovRad / 2);

  // Avoid divide by zero / points behind camera
  const z = Math.max(0.1, p.z);
  const scale = focalLength / z;

  // Center screen projection
  const screenX = viewWidth / 2 + p.x * scale;
  const screenY = viewHeight / 2 - p.y * scale; // invert Y for screen coords

  const visible =
    screenX >= -50 &&
    screenX <= viewWidth + 50 &&
    screenY >= -50 &&
    screenY <= viewHeight + 50;

  return {
    x: screenX,
    y: screenY,
    scale: Math.max(0.4, Math.min(1.6, 1.2 / z)),
    visible,
  };
};

/**
 * Creates SVG path string for a polygon formed by 2D screen points.
 */
export const pointsToSvgPath = (points: { x: number; y: number }[]): string => {
  if (points.length === 0) return "";
  const first = points[0];
  if (!first) return "";
  const d = points.slice(1).reduce((acc, p) => `${acc} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`);
  return `${d} Z`;
};
