import { describe, it, expect } from "vitest";
import {
  distance3D,
  pathLength3D,
  perimeter3D,
  polygonArea3D,
  angleBetween3D,
  vectorSubtract,
  vectorAdd,
  vectorScale,
  dotProduct3D,
  crossProduct3D,
  vectorMagnitude3D,
  vectorNormalize3D,
  midpoint3D,
  centroid3D,
  boundingBox3D,
  convertDistance,
  convertArea,
  convertAngle,
  formatDistance,
  formatArea,
  formatAngle,
  Point3D,
} from "../src/ar-ruler/index";

describe("AR Ruler 3D Geometry Engine", () => {
  describe("distance3D", () => {
    it("calculates distance along single axes", () => {
      expect(distance3D({ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 })).toBe(5);
      expect(distance3D({ x: 0, y: -3, z: 0 }, { x: 0, y: 4, z: 0 })).toBe(7);
      expect(distance3D({ x: 0, y: 0, z: 2 }, { x: 0, y: 0, z: -8 })).toBe(10);
    });

    it("calculates 3D Euclidean distance (3-4-12 triangle -> 13)", () => {
      const p1: Point3D = { x: 0, y: 0, z: 0 };
      const p2: Point3D = { x: 3, y: 4, z: 12 };
      expect(distance3D(p1, p2)).toBeCloseTo(13, 6);
    });

    it("returns 0 for identical points", () => {
      const p: Point3D = { x: 1.25, y: -4.5, z: 8.9 };
      expect(distance3D(p, p)).toBe(0);
    });
  });

  describe("pathLength3D", () => {
    it("returns 0 for empty or single point arrays", () => {
      expect(pathLength3D([])).toBe(0);
      expect(pathLength3D([{ x: 1, y: 2, z: 3 }])).toBe(0);
    });

    it("accumulates distance across multi-segment continuous paths", () => {
      const points: Point3D[] = [
        { x: 0, y: 0, z: 0 },
        { x: 3, y: 0, z: 0 }, // +3
        { x: 3, y: 4, z: 0 }, // +4
        { x: 3, y: 4, z: 12 }, // +12
      ];
      expect(pathLength3D(points)).toBe(3 + 4 + 12);
    });
  });

  describe("perimeter3D", () => {
    it("returns 0 for empty or single point arrays", () => {
      expect(perimeter3D([])).toBe(0);
      expect(perimeter3D([{ x: 0, y: 0, z: 0 }])).toBe(0);
    });

    it("returns 2x distance for two points (back and forth)", () => {
      const p1: Point3D = { x: 0, y: 0, z: 0 };
      const p2: Point3D = { x: 10, y: 0, z: 0 };
      expect(perimeter3D([p1, p2])).toBe(20);
    });

    it("calculates perimeter of closed 3D triangle", () => {
      const triangle: Point3D[] = [
        { x: 0, y: 0, z: 0 },
        { x: 3, y: 0, z: 0 },
        { x: 0, y: 4, z: 0 },
      ];
      // Sides: 3, 5 (hypotenuse between (3,0,0) & (0,4,0)), 4
      expect(perimeter3D(triangle)).toBe(3 + 5 + 4);
    });

    it("calculates perimeter of a 3D rectangle in space", () => {
      const rect: Point3D[] = [
        { x: 0, y: 0, z: 1 },
        { x: 5, y: 0, z: 1 },
        { x: 5, y: 2, z: 1 },
        { x: 0, y: 2, z: 1 },
      ];
      expect(perimeter3D(rect)).toBe(5 + 2 + 5 + 2);
    });
  });

  describe("polygonArea3D (Newell Method / Cross-Product)", () => {
    it("returns 0 for fewer than 3 points", () => {
      expect(polygonArea3D([])).toBe(0);
      expect(polygonArea3D([{ x: 0, y: 0, z: 0 }])).toBe(0);
      expect(
        polygonArea3D([
          { x: 0, y: 0, z: 0 },
          { x: 1, y: 1, z: 1 },
        ]),
      ).toBe(0);
    });

    it("calculates 2D planar triangle area on XY plane", () => {
      const triangle: Point3D[] = [
        { x: 0, y: 0, z: 0 },
        { x: 4, y: 0, z: 0 },
        { x: 0, y: 3, z: 0 },
      ];
      // Area = 0.5 * base * height = 0.5 * 4 * 3 = 6
      expect(polygonArea3D(triangle)).toBeCloseTo(6, 6);
    });

    it("calculates rectangle area on XZ plane", () => {
      const rect: Point3D[] = [
        { x: 0, y: 5, z: 0 },
        { x: 10, y: 5, z: 0 },
        { x: 10, y: 5, z: 4 },
        { x: 0, y: 5, z: 4 },
      ];
      // Area = 10 * 4 = 40
      expect(polygonArea3D(rect)).toBeCloseTo(40, 6);
    });

    it("calculates tilted 3D planar rectangle area", () => {
      // Rectangle with width = sqrt(1^2 + 1^2) = sqrt(2), height = 3 along Y axis
      const tilted: Point3D[] = [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 1 },
        { x: 1, y: 3, z: 1 },
        { x: 0, y: 3, z: 0 },
      ];
      const expectedArea = Math.SQRT2 * 3;
      expect(polygonArea3D(tilted)).toBeCloseTo(expectedArea, 6);
    });

    it("returns 0 for collinear points", () => {
      const collinear: Point3D[] = [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 1, z: 1 },
        { x: 2, y: 2, z: 2 },
      ];
      expect(polygonArea3D(collinear)).toBeCloseTo(0, 6);
    });
  });

  describe("angleBetween3D", () => {
    it("calculates 90 degree orthogonal angle", () => {
      const a: Point3D = { x: 1, y: 0, z: 0 };
      const b: Point3D = { x: 0, y: 0, z: 0 }; // vertex
      const c: Point3D = { x: 0, y: 1, z: 0 };
      expect(angleBetween3D(a, b, c, "deg")).toBeCloseTo(90, 4);
      expect(angleBetween3D(a, b, c, "rad")).toBeCloseTo(Math.PI / 2, 4);
    });

    it("calculates 45 degree angle in 3D", () => {
      const a: Point3D = { x: 1, y: 0, z: 0 };
      const b: Point3D = { x: 0, y: 0, z: 0 };
      const c: Point3D = { x: 1, y: 1, z: 0 };
      expect(angleBetween3D(a, b, c, "deg")).toBeCloseTo(45, 4);
    });

    it("calculates 180 degree angle for opposite collinear vectors", () => {
      const a: Point3D = { x: -5, y: 0, z: 0 };
      const b: Point3D = { x: 0, y: 0, z: 0 };
      const c: Point3D = { x: 5, y: 0, z: 0 };
      expect(angleBetween3D(a, b, c, "deg")).toBeCloseTo(180, 4);
    });

    it("calculates 0 degree angle for identical rays", () => {
      const a: Point3D = { x: 3, y: 0, z: 0 };
      const b: Point3D = { x: 0, y: 0, z: 0 };
      const c: Point3D = { x: 6, y: 0, z: 0 };
      expect(angleBetween3D(a, b, c, "deg")).toBeCloseTo(0, 4);
    });

    it("handles zero length vectors safely", () => {
      const a: Point3D = { x: 0, y: 0, z: 0 };
      const b: Point3D = { x: 0, y: 0, z: 0 };
      const c: Point3D = { x: 1, y: 1, z: 1 };
      expect(angleBetween3D(a, b, c)).toBe(0);
    });
  });

  describe("Vector math helpers", () => {
    it("performs vector subtraction and addition", () => {
      const v1 = vectorSubtract({ x: 5, y: 3, z: 1 }, { x: 2, y: 1, z: 1 });
      expect(v1).toEqual({ x: 3, y: 2, z: 0 });

      const p2 = vectorAdd({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 });
      expect(p2).toEqual({ x: 5, y: 7, z: 9 });
    });

    it("scales vectors", () => {
      const scaled = vectorScale({ x: 2, y: -3, z: 4 }, 2.5);
      expect(scaled).toEqual({ x: 5, y: -7.5, z: 10 });
    });

    it("computes dot product and cross product", () => {
      const dot = dotProduct3D({ x: 1, y: 2, z: 3 }, { x: 4, y: -5, z: 6 });
      expect(dot).toBe(1 * 4 + 2 * -5 + 3 * 6); // 4 - 10 + 18 = 12

      // i x j = k
      const cross = crossProduct3D({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
      expect(cross).toEqual({ x: 0, y: 0, z: 1 });
    });

    it("normalizes vector to unit length", () => {
      const norm = vectorNormalize3D({ x: 3, y: 0, z: 4 });
      expect(vectorMagnitude3D(norm)).toBeCloseTo(1, 6);
      expect(norm.x).toBeCloseTo(0.6, 6);
      expect(norm.z).toBeCloseTo(0.8, 6);

      expect(vectorNormalize3D({ x: 0, y: 0, z: 0 })).toEqual({
        x: 0,
        y: 0,
        z: 0,
      });
    });

    it("finds midpoint and centroid", () => {
      const mid = midpoint3D({ x: 0, y: 10, z: 2 }, { x: 10, y: 0, z: 8 });
      expect(mid).toEqual({ x: 5, y: 5, z: 5 });

      const cent = centroid3D([
        { x: 0, y: 0, z: 0 },
        { x: 3, y: 6, z: 9 },
        { x: 6, y: 3, z: 0 },
      ]);
      expect(cent).toEqual({ x: 3, y: 3, z: 3 });
    });

    it("calculates bounding box", () => {
      const points: Point3D[] = [
        { x: -2, y: 10, z: 5 },
        { x: 8, y: -4, z: 12 },
        { x: 3, y: 6, z: -1 },
      ];
      const bb = boundingBox3D(points);
      expect(bb.min).toEqual({ x: -2, y: -4, z: -1 });
      expect(bb.max).toEqual({ x: 8, y: 10, z: 12 });
      expect(bb.dimensions).toEqual({ x: 10, y: 14, z: 13 });
    });
  });

  describe("Units & Formatting Engine", () => {
    it("converts distance across all supported units", () => {
      expect(convertDistance(1, "m", "cm")).toBe(100);
      expect(convertDistance(1, "m", "mm")).toBe(1000);
      expect(convertDistance(1, "in", "cm")).toBeCloseTo(2.54, 4);
      expect(convertDistance(1, "ft", "in")).toBeCloseTo(12, 4);
      expect(convertDistance(1, "yd", "ft")).toBeCloseTo(3, 4);
      expect(convertDistance(100, "cm", "m")).toBe(1);
    });

    it("converts area correctly", () => {
      // 1 m² = 10,000 cm²
      expect(convertArea(1, "m", "cm")).toBeCloseTo(10000, 4);
      // 1 sq yard = 9 sq feet
      expect(convertArea(1, "yd", "ft")).toBeCloseTo(9, 4);
    });

    it("converts angles", () => {
      expect(convertAngle(180, "deg", "rad")).toBeCloseTo(Math.PI, 6);
      expect(convertAngle(Math.PI, "rad", "deg")).toBeCloseTo(180, 6);
    });

    it("formats distances with unit symbols", () => {
      expect(formatDistance(1.854, "m", 2)).toBe("1.85 m");
      expect(formatDistance(1.854, "cm", 1)).toBe("185.4 cm");
      expect(formatDistance(0.0254, "in", 1)).toBe("1 in");
      expect(formatDistance(0.9144, "yd", 2)).toBe("1 yd");
    });

    it("formats areas with unit symbols", () => {
      expect(formatArea(2.5, "m", 2)).toBe("2.5 m²");
      expect(formatArea(0.09290304, "ft", 2)).toBe("1 ft²");
    });

    it("formats angles", () => {
      expect(formatAngle(45.678, "deg", 1)).toBe("45.7°");
      expect(formatAngle(90, "rad", 2)).toBe(
        `${Number((Math.PI / 2).toFixed(3))} rad`,
      );
    });
  });
});
