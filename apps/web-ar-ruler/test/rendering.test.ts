import { afterEach, describe, expect, it, vi } from "vitest";
import { Renderer3D } from "../src/canvas/renderer3d";
import { WebXREngine } from "../src/xr/webxr-engine";
import type { Point3D } from "@plainoss/core";

function context2D() {
  return new Proxy(
    { measureText: () => ({ width: 40 }) },
    {
      get(target, key) {
        return Reflect.get(target, key) ?? (() => {});
      },
    },
  );
}

function canvas2D() {
  let width = 800;
  let height = 600;
  const rect = vi.fn(() => ({ width, height }));
  const canvas = {
    getContext: () => context2D(),
    getBoundingClientRect: rect,
    width,
    height,
  } as unknown as HTMLCanvasElement;
  return {
    canvas,
    rect,
    setSize: (w: number, h: number) => {
      width = w;
      height = h;
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("canvas projection caching", () => {
  it("keeps projection accurate after camera edits and resize without inner-loop layout reads", () => {
    vi.stubGlobal("window", { devicePixelRatio: 2 });
    const { canvas, rect, setSize } = canvas2D();
    const renderer = new Renderer3D(canvas);
    renderer.resize();
    expect(renderer.project({ x: 0, y: 0, z: 0 })).toEqual({
      x: 400,
      y: 300,
      depth: 4.5,
    });
    const point = { x: 1, y: 2, z: 3 };
    for (const [yaw, pitch] of [
      [0, 0],
      [1.2, -0.4],
      [-0.8, 0.9],
    ]) {
      renderer.camera.yaw = yaw!;
      renderer.camera.pitch = pitch!;
      const x = point.x * Math.cos(yaw!) - point.z * Math.sin(yaw!);
      const z = point.x * Math.sin(yaw!) + point.z * Math.cos(yaw!);
      const depth = point.y * Math.sin(pitch!) + z * Math.cos(pitch!) + 4.5;
      const expectedY = point.y * Math.cos(pitch!) - z * Math.sin(pitch!);
      const projected = renderer.project(point)!;
      expect(projected.x).toBeCloseTo(400 + (x * renderer.fov) / depth);
      expect(projected.y).toBeCloseTo(300 - (expectedY * renderer.fov) / depth);
      expect(projected.depth).toBeCloseTo(depth);
    }
    const reads = rect.mock.calls.length;
    renderer.render(
      [point, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
      null,
      "polygon",
      "m",
      "deg",
    );
    renderer.unprojectGround(400, 300);
    renderer.unprojectRayDistance(400, 300);
    expect(rect).toHaveBeenCalledTimes(reads);
    setSize(1000, 500);
    renderer.resize();
    expect(canvas.width).toBe(2000);
    expect(renderer.project({ x: 0, y: 0, z: 0 })).toEqual({
      x: 500,
      y: 250,
      depth: 4.5,
    });
    renderer.camera.yaw = 0;
    renderer.camera.pitch = 0;
    expect(renderer.project({ x: 0, y: 0, z: -5 })).toBeNull();
  });
});

interface EngineInternals {
  generateRoomPlaneGrid(time: number, camera: Point3D): number;
  writeCylinderMesh(a: Point3D, b: Point3D, radius: number): number;
  renderScene(
    projection: Float32Array,
    view: Float32Array,
    count: number,
  ): void;
  roomGridBuffer: Float32Array;
  cylinderBuffer: Float32Array;
}

function xrEngine() {
  let bound: object | null = null;
  let positionBuffer: object | null = null;
  let positionStride = 12;
  const capacities = new Map<object, number>();
  const draw = vi.fn((_mode: number, _first: number, count: number) => {
    expect(capacities.get(positionBuffer!)).toBeGreaterThanOrEqual(
      count * positionStride,
    );
  });
  const upload = vi.fn((_target: number, data: number | Float32Array) => {
    capacities.set(bound!, typeof data === "number" ? data : data.byteLength);
  });
  const update = vi.fn(
    (_target: number, _offset: number, data: Float32Array) => {
      expect(capacities.get(bound!)).toBeGreaterThanOrEqual(data.byteLength);
    },
  );
  const methods = {
    ARRAY_BUFFER: 1,
    POINTS: 2,
    TRIANGLES: 3,
    createBuffer: () => ({}),
    createProgram: () => ({}),
    createShader: () => ({}),
    bindBuffer: (_target: number, buffer: object) => {
      bound = buffer;
    },
    bufferData: upload,
    bufferSubData: update,
    getAttribLocation: (_program: object, name: string) =>
      name === "aAlpha" ? 1 : 0,
    vertexAttribPointer: (
      location: number,
      size: number,
      _type: number,
      _normalized: boolean,
      stride: number,
    ) => {
      if (location === 0) {
        positionBuffer = bound;
        positionStride = stride || size * 4;
      }
    },
    drawArrays: draw,
  };
  const gl = new Proxy(methods, {
    get(target, key) {
      return Reflect.get(target, key) ?? (() => {});
    },
  });
  vi.stubGlobal("document", {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => context2D(),
    }),
  });
  const engine = new WebXREngine(
    { getContext: () => gl } as unknown as HTMLCanvasElement,
    {
      onPointPlaced: () => {},
      onSessionStarted: () => {},
      onSessionEnded: () => {},
    },
  );
  return {
    engine,
    internal: engine as unknown as EngineInternals,
    draw,
    upload,
    update,
  };
}

describe("WebXR buffer reuse", () => {
  it.each([
    [0, 0, 0, 1185],
    [1, 0.074, -0.071, 1246],
    [2, 3.05, 1.04, 1298],
  ])(
    "preserves the complete scanning grid at time %s",
    (time, x, z, expectedCount) => {
      const { internal } = xrEngine();
      const count = internal.generateRoomPlaneGrid(time!, {
        x: x!,
        y: 1.65,
        z: z!,
      });
      expect(count).toBe(expectedCount);
      expect(count * 4).toBeLessThanOrEqual(internal.roomGridBuffer.length);
      for (let i = 0; i < count * 4; i += 4) {
        expect(internal.roomGridBuffer[i + 1]).toBeCloseTo(1);
        expect(internal.roomGridBuffer[i + 3]).toBeGreaterThanOrEqual(0.04);
      }
      internal.renderScene(new Float32Array(16), new Float32Array(16), count);
    },
  );

  it.each([
    { x: 0, y: 1, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 1, y: 2, z: 3 },
  ])("writes complete finite cylinder geometry toward %j", (end) => {
    const { internal } = xrEngine();
    const start = { x: 0, y: 0, z: 0 };
    expect(internal.writeCylinderMesh(start, end, 0.009)).toBe(48);
    expect(internal.cylinderBuffer.length).toBe(144);
    expect([...internal.cylinderBuffer].every(Number.isFinite)).toBe(true);
    const length = Math.hypot(end.x, end.y, end.z);
    for (let i = 0; i < 144; i += 3) {
      const [x, y, z] = internal.cylinderBuffer.slice(i, i + 3) as unknown as [
        number,
        number,
        number,
      ];
      const along = (x * end.x + y * end.y + z * end.z) / length;
      expect(Math.min(Math.abs(along), Math.abs(along - length))).toBeLessThan(
        1e-6,
      );
      expect(
        Math.sqrt(Math.max(0, x * x + y * y + z * z - along * along)),
      ).toBeCloseTo(0.009, 5);
    }
    expect(internal.writeCylinderMesh(start, start, 0.009)).toBe(0);
  });

  it("reuses GPU buffers and preserves normal, hovered, and dragged handle tessellation", () => {
    const { engine, internal, draw, upload, update } = xrEngine();
    engine.reticleMatrix = new Float32Array([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ]);
    engine.points = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
    ];
    upload.mockClear();
    for (const state of ["normal", "hovered", "dragged"]) {
      engine.hoveredHandleIndex = state === "hovered" ? 0 : null;
      engine.draggedPointIndex = state === "dragged" ? 0 : null;
      draw.mockClear();
      internal.renderScene(new Float32Array(16), new Float32Array(16), 0);
      expect(draw.mock.calls.map((call) => call[2])).toEqual([
        1344,
        384,
        48,
        state === "normal" ? 600 : 864,
        600,
        6,
      ]);
    }
    expect(upload).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(3);
  });
});
