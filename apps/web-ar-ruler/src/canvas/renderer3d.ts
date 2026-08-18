/**
 * Zero-bloat Pure 3D Canvas Renderer & Orbit Engine
 * Renders 3D grids, spatial measurement points, lines, polygons, and text labels.
 */

import {
  Point3D,
  MeasurementMode,
  DistanceUnit,
  AngleUnit,
  distance3D,
  polygonArea3D,
  angleBetween3D,
  formatDistance,
  formatArea,
  formatAngle,
  midpoint3D,
  centroid3D,
} from "@plainoss/core";

export interface CameraState {
  yaw: number; // in radians
  pitch: number; // in radians
  distance: number; // meters from target
  target: Point3D;
}

export interface RenderTheme {
  bg: string;
  gridLine: string;
  gridLineMajor: string;
  axisX: string;
  axisZ: string;
  pointFill: string;
  pointActive: string;
  pointStroke: string;
  lineStroke: string;
  lineGuide: string;
  polygonFill: string;
  polygonStroke: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  textMuted: string;
}

export const DARK_THEME: RenderTheme = {
  bg: "#0a0a0c",
  gridLine: "rgba(255, 255, 255, 0.07)",
  gridLineMajor: "rgba(255, 255, 255, 0.18)",
  axisX: "#ef4444",
  axisZ: "#3b82f6",
  pointFill: "#60a5fa",
  pointActive: "#38bdf8",
  pointStroke: "#ffffff",
  lineStroke: "#3b82f6",
  lineGuide: "rgba(96, 165, 250, 0.45)",
  polygonFill: "rgba(59, 130, 246, 0.22)",
  polygonStroke: "#60a5fa",
  badgeBg: "rgba(20, 20, 26, 0.92)",
  badgeText: "#f8fafc",
  badgeBorder: "rgba(255, 255, 255, 0.16)",
  textMuted: "#94a3b8",
};

export const LIGHT_THEME: RenderTheme = {
  bg: "#f8f9fa",
  gridLine: "rgba(0, 0, 0, 0.06)",
  gridLineMajor: "rgba(0, 0, 0, 0.15)",
  axisX: "#dc2626",
  axisZ: "#2563eb",
  pointFill: "#2563eb",
  pointActive: "#0284c7",
  pointStroke: "#ffffff",
  lineStroke: "#2563eb",
  lineGuide: "rgba(37, 99, 235, 0.4)",
  polygonFill: "rgba(37, 99, 235, 0.15)",
  polygonStroke: "#2563eb",
  badgeBg: "rgba(255, 255, 255, 0.94)",
  badgeText: "#0f172a",
  badgeBorder: "rgba(0, 0, 0, 0.12)",
  textMuted: "#64748b",
};

export const AR_THEME: RenderTheme = {
  bg: "transparent",
  gridLine: "rgba(255, 255, 255, 0.15)",
  gridLineMajor: "rgba(255, 255, 255, 0.35)",
  axisX: "#ef4444",
  axisZ: "#38bdf8",
  pointFill: "#38bdf8",
  pointActive: "#f59e0b",
  pointStroke: "#ffffff",
  lineStroke: "#38bdf8",
  lineGuide: "rgba(56, 189, 248, 0.65)",
  polygonFill: "rgba(56, 189, 248, 0.3)",
  polygonStroke: "#38bdf8",
  badgeBg: "rgba(15, 23, 42, 0.92)",
  badgeText: "#ffffff",
  badgeBorder: "rgba(56, 189, 248, 0.5)",
  textMuted: "#cbd5e1",
};

export class Renderer3D {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public camera: CameraState = {
    yaw: Math.PI / 4,
    pitch: Math.PI / 6,
    distance: 4.5,
    target: { x: 0, y: 0, z: 0 },
  };
  public fov: number = 650;
  public theme: RenderTheme = DARK_THEME;
  public isARMode: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context not supported");
    }
    this.ctx = context;
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.scale(dpr, dpr);
    this.fov = Math.max(rect.width, rect.height) * 0.9;
  }

  /**
   * Projects a 3D world coordinate into 2D screen coordinate.
   * Returns null if behind the camera near plane.
   */
  public project(p: Point3D): { x: number; y: number; depth: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // 1. Target relative
    const rx = p.x - this.camera.target.x;
    const ry = p.y - this.camera.target.y;
    const rz = p.z - this.camera.target.z;

    // 2. Yaw rotation (around Y axis)
    const cosY = Math.cos(this.camera.yaw);
    const sinY = Math.sin(this.camera.yaw);
    const x1 = rx * cosY - rz * sinY;
    const z1 = rx * sinY + rz * cosY;

    // 3. Pitch rotation (around X axis)
    const cosP = Math.cos(this.camera.pitch);
    const sinP = Math.sin(this.camera.pitch);
    const y2 = ry * cosP - z1 * sinP;
    const z2 = ry * sinP + z1 * cosP;

    // 4. Translate along camera distance
    const camZ = z2 + this.camera.distance;

    if (camZ <= 0.1) {
      return null; // Behind camera
    }

    const scale = this.fov / camZ;
    const screenX = width / 2 + x1 * scale;
    const screenY = height / 2 - y2 * scale;

    return { x: screenX, y: screenY, depth: camZ };
  }

  /**
   * Raycasts a 2D screen point to the 3D ground plane (Y = planeY).
   */
  public unprojectGround(
    screenX: number,
    screenY: number,
    planeY: number = 0,
  ): Point3D | null {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const normX = (screenX - width / 2) / this.fov;
    const normY = -(screenY - height / 2) / this.fov;

    // Ray in camera space
    const rCam = { x: normX, y: normY, z: 1 };

    // Un-pitch
    const cosP = Math.cos(-this.camera.pitch);
    const sinP = Math.sin(-this.camera.pitch);
    const ry1 = rCam.y * cosP - rCam.z * sinP;
    const rz1 = rCam.y * sinP + rCam.z * cosP;

    // Un-yaw
    const cosY = Math.cos(-this.camera.yaw);
    const sinY = Math.sin(-this.camera.yaw);
    const rx2 = rCam.x * cosY - rz1 * sinY;
    const rz2 = rCam.x * sinY + rz1 * cosY;

    // Camera origin in world space
    const camOriginRel = {
      x: 0,
      y: -this.camera.distance * Math.sin(this.camera.pitch),
      z: -this.camera.distance * Math.cos(this.camera.pitch),
    };
    const camOriginWorld = {
      x: this.camera.target.x + (camOriginRel.x * cosY - camOriginRel.z * sinY),
      y: this.camera.target.y + (camOriginRel.y * cosP + camOriginRel.z * sinP),
      z: this.camera.target.z + (camOriginRel.x * sinY + camOriginRel.z * cosY),
    };

    if (Math.abs(ry1) < 0.0001) {
      return null;
    }

    const t = (planeY - camOriginWorld.y) / ry1;
    if (t <= 0) {
      // If ray doesn't hit ground in front of camera, unproject along ray at 2 meters
      return this.unprojectRayDistance(screenX, screenY, 2.0);
    }

    return {
      x: camOriginWorld.x + rx2 * t,
      y: planeY,
      z: camOriginWorld.z + rz2 * t,
    };
  }

  /**
   * Unprojects a screen point to a 3D coordinate along the view ray at a specific distance.
   */
  public unprojectRayDistance(
    screenX: number,
    screenY: number,
    distanceMeters: number = 1.5,
  ): Point3D {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || 1;
    const height = rect.height || 1;

    const normX = (screenX - width / 2) / this.fov;
    const normY = -(screenY - height / 2) / this.fov;

    const cosP = Math.cos(-this.camera.pitch);
    const sinP = Math.sin(-this.camera.pitch);
    const ry1 = normY * cosP - 1 * sinP;
    const rz1 = normY * sinP + 1 * cosP;

    const cosY = Math.cos(-this.camera.yaw);
    const sinY = Math.sin(-this.camera.yaw);
    const rx2 = normX * cosY - rz1 * sinY;
    const rz2 = normX * sinY + rz1 * cosY;

    const rayDirLen = Math.sqrt(rx2 * rx2 + ry1 * ry1 + rz2 * rz2) || 1;
    const dirX = rx2 / rayDirLen;
    const dirY = ry1 / rayDirLen;
    const dirZ = rz2 / rayDirLen;

    const camOriginRel = {
      x: 0,
      y: -this.camera.distance * Math.sin(this.camera.pitch),
      z: -this.camera.distance * Math.cos(this.camera.pitch),
    };
    const camOriginWorld = {
      x: this.camera.target.x + (camOriginRel.x * cosY - camOriginRel.z * sinY),
      y: this.camera.target.y + (camOriginRel.y * cosP + camOriginRel.z * sinP),
      z: this.camera.target.z + (camOriginRel.x * sinY + camOriginRel.z * cosY),
    };

    return {
      x: camOriginWorld.x + dirX * distanceMeters,
      y: camOriginWorld.y + dirY * distanceMeters,
      z: camOriginWorld.z + dirZ * distanceMeters,
    };
  }

  /**
   * Main render pass
   */
  public render(
    points: Point3D[],
    hoverPoint: Point3D | null,
    mode: MeasurementMode,
    unit: DistanceUnit,
    angleUnit: AngleUnit,
  ): void {
    const rect = this.canvas.getBoundingClientRect();
    const ctx = this.ctx;

    ctx.clearRect(0, 0, rect.width, rect.height);

    // 1. Draw 3D Ground Grid (or spatial crosshairs in AR mode)
    this.renderGrid();

    // 2. Draw polygon fill if in Polygon mode
    if (mode === "polygon" && points.length >= 3) {
      this.renderPolygon(points, unit);
    }

    // 3. Draw connecting lines
    this.renderLines(points, hoverPoint, mode, unit);

    // 4. Draw Angle indicator if in Angle mode
    if (mode === "angle" && points.length >= 2) {
      this.renderAngle(points, hoverPoint, angleUnit);
    }

    // 5. Draw 3D point markers
    this.renderPoints(points, hoverPoint);
  }

  private renderGrid(): void {
    const ctx = this.ctx;
    const gridRange = this.isARMode ? 2 : 3;
    const step = 0.5;

    ctx.lineWidth = 1;

    for (let i = -gridRange; i <= gridRange; i += step) {
      const isMajor = Math.abs(i % 1) < 0.01;
      ctx.strokeStyle = isMajor
        ? this.theme.gridLineMajor
        : this.theme.gridLine;

      // X lines (parallel to Z axis)
      const pX1 = this.project({ x: i, y: 0, z: -gridRange });
      const pX2 = this.project({ x: i, y: 0, z: gridRange });
      if (pX1 && pX2) {
        ctx.beginPath();
        ctx.moveTo(pX1.x, pX1.y);
        ctx.lineTo(pX2.x, pX2.y);
        ctx.stroke();
      }

      // Z lines (parallel to X axis)
      const pZ1 = this.project({ x: -gridRange, y: 0, z: i });
      const pZ2 = this.project({ x: gridRange, y: 0, z: i });
      if (pZ1 && pZ2) {
        ctx.beginPath();
        ctx.moveTo(pZ1.x, pZ1.y);
        ctx.lineTo(pZ2.x, pZ2.y);
        ctx.stroke();
      }
    }

    // Axis indicators at origin
    const origin = this.project({ x: 0, y: 0, z: 0 });
    const axisX = this.project({ x: 1, y: 0, z: 0 });
    const axisZ = this.project({ x: 0, y: 0, z: 1 });

    if (origin && axisX) {
      ctx.strokeStyle = this.theme.axisX;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(axisX.x, axisX.y);
      ctx.stroke();
    }
    if (origin && axisZ) {
      ctx.strokeStyle = this.theme.axisZ;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(axisZ.x, axisZ.y);
      ctx.stroke();
    }
  }

  private renderPolygon(points: Point3D[], unit: DistanceUnit): void {
    const ctx = this.ctx;
    const projected = points
      .map((p) => this.project(p))
      .filter((p): p is { x: number; y: number; depth: number } => p !== null);

    if (projected.length < 3) return;

    const first = projected[0];
    if (!first) return;

    ctx.fillStyle = this.theme.polygonFill;
    ctx.strokeStyle = this.theme.polygonStroke;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < projected.length; i++) {
      const pt = projected[i];
      if (pt) {
        ctx.lineTo(pt.x, pt.y);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Area badge at centroid
    const center = centroid3D(points);
    const pCenter = this.project(center);
    if (pCenter) {
      const area = polygonArea3D(points);
      const text = formatArea(area, unit);
      this.drawBadge(pCenter.x, pCenter.y, text, "Area");
    }
  }

  private renderLines(
    points: Point3D[],
    hoverPoint: Point3D | null,
    mode: MeasurementMode,
    unit: DistanceUnit,
  ): void {
    const ctx = this.ctx;

    // Segment lines between placed points
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      if (!p1 || !p2) continue;

      const s1 = this.project(p1);
      const s2 = this.project(p2);

      if (s1 && s2) {
        ctx.strokeStyle = this.theme.lineStroke;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(s1.x, s1.y);
        ctx.lineTo(s2.x, s2.y);
        ctx.stroke();

        // Distance badge on segment midpoint
        const mid = midpoint3D(p1, p2);
        const sMid = this.project(mid);
        if (sMid) {
          const dist = distance3D(p1, p2);
          this.drawBadge(sMid.x, sMid.y, formatDistance(dist, unit));
        }
      }
    }

    // Closed loop line for polygon mode
    if (mode === "polygon" && points.length >= 3) {
      const pLast = points[points.length - 1];
      const pFirst = points[0];
      if (pLast && pFirst) {
        const sLast = this.project(pLast);
        const sFirst = this.project(pFirst);
        if (sLast && sFirst) {
          ctx.strokeStyle = this.theme.lineStroke;
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(sLast.x, sLast.y);
          ctx.lineTo(sFirst.x, sFirst.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    // Guide line to hover/crosshair point
    if (hoverPoint && points.length > 0) {
      const pLast = points[points.length - 1];
      if (pLast) {
        const sLast = this.project(pLast);
        const sHover = this.project(hoverPoint);

        if (sLast && sHover) {
          ctx.strokeStyle = this.theme.lineGuide;
          ctx.lineWidth = 2.5;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(sLast.x, sLast.y);
          ctx.lineTo(sHover.x, sHover.y);
          ctx.stroke();
          ctx.setLineDash([]);

          const mid = midpoint3D(pLast, hoverPoint);
          const sMid = this.project(mid);
          if (sMid) {
            const dist = distance3D(pLast, hoverPoint);
            this.drawBadge(sMid.x, sMid.y, formatDistance(dist, unit), "Live");
          }
        }
      }
    }
  }

  private renderAngle(
    points: Point3D[],
    hoverPoint: Point3D | null,
    angleUnit: AngleUnit,
  ): void {
    let pA: Point3D | null = null;
    let pB: Point3D | null = null; // Apex
    let pC: Point3D | null = null;

    if (points.length >= 3) {
      pA = points[0] ?? null;
      pB = points[1] ?? null;
      pC = points[2] ?? null;
    } else if (points.length === 2 && hoverPoint) {
      pA = points[0] ?? null;
      pB = points[1] ?? null;
      pC = hoverPoint;
    }

    if (!pA || !pB || !pC) return;

    const angle = angleBetween3D(pA, pB, pC, angleUnit);
    const sApex = this.project(pB);

    if (sApex) {
      this.drawBadge(
        sApex.x,
        sApex.y - 32,
        formatAngle(angle, angleUnit),
        "Angle",
      );
    }
  }

  private renderPoints(points: Point3D[], hoverPoint: Point3D | null): void {
    const ctx = this.ctx;

    points.forEach((p, idx) => {
      const sp = this.project(p);
      if (!sp) return;

      const isFirst = idx === 0;
      const isLast = idx === points.length - 1;

      // Outer glow/ring
      ctx.fillStyle = isLast ? this.theme.pointActive : this.theme.pointFill;
      ctx.strokeStyle = this.theme.pointStroke;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.arc(sp.x, sp.y, isFirst || isLast ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Point label index (P1, P2...)
      ctx.fillStyle = this.theme.badgeText;
      ctx.font = "700 12px system-ui, sans-serif";
      ctx.fillText(`P${idx + 1}`, sp.x + 11, sp.y - 8);
    });

    // Hover cursor indicator
    if (hoverPoint) {
      const sHover = this.project(hoverPoint);
      if (sHover) {
        ctx.strokeStyle = this.theme.pointActive;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(sHover.x, sHover.y, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  private drawBadge(
    x: number,
    y: number,
    text: string,
    subtitle?: string,
  ): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = "700 12px system-ui, -apple-system, sans-serif";
    const mainWidth = ctx.measureText(text).width;
    let totalWidth = mainWidth + 18;

    let subWidth = 0;
    if (subtitle) {
      ctx.font = "600 10px system-ui, -apple-system, sans-serif";
      subWidth = ctx.measureText(subtitle).width;
      totalWidth = Math.max(totalWidth, subWidth + 18);
    }

    const height = subtitle ? 38 : 26;
    const badgeX = x - totalWidth / 2;
    const badgeY = y - height / 2;

    // Rounded rectangle badge
    ctx.fillStyle = this.theme.badgeBg;
    ctx.strokeStyle = this.theme.badgeBorder;
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, badgeX, badgeY, totalWidth, height, 7);
    ctx.fill();
    ctx.stroke();

    // Text rendering
    if (subtitle) {
      ctx.fillStyle = this.theme.textMuted;
      ctx.font = "600 10px system-ui, -apple-system, sans-serif";
      ctx.fillText(subtitle, x - subWidth / 2, badgeY + 14);

      ctx.fillStyle = this.theme.badgeText;
      ctx.font = "800 12px system-ui, -apple-system, sans-serif";
      ctx.fillText(text, x - mainWidth / 2, badgeY + 30);
    } else {
      ctx.fillStyle = this.theme.badgeText;
      ctx.font = "700 12px system-ui, -apple-system, sans-serif";
      ctx.fillText(text, x - mainWidth / 2, badgeY + 17);
    }

    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
