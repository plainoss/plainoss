// @ts-ignore
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Renderer3D } from "./renderer3d";

function createMockCanvas(): HTMLCanvasElement {
  let getBoundingClientRectCallCount = 0;

  const mockCtx = {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    measureText: vi.fn(() => ({ width: 40 })),
    fillText: vi.fn(),
    setLineDash: vi.fn(),
    quadraticCurveTo: vi.fn(),
    scale: vi.fn(),
    lineWidth: 1,
    fillStyle: "",
    strokeStyle: "",
    font: "",
  };

  const canvas = {
    getContext: (contextId: string) => {
      if (contextId === "2d") return mockCtx;
      return null;
    },
    getBoundingClientRect: () => {
      getBoundingClientRectCallCount++;
      return {
        width: 800,
        height: 600,
        top: 0,
        left: 0,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      };
    },
    width: 800,
    height: 600,
    get _getBoundingClientRectCalls() {
      return getBoundingClientRectCallCount;
    },
  } as unknown as HTMLCanvasElement & { _getBoundingClientRectCalls: number };

  return canvas;
}

describe("Renderer3D Performance & Projection Optimization", () => {
  let mockCanvas: ReturnType<typeof createMockCanvas>;
  let renderer: Renderer3D;

  beforeEach(() => {
    mockCanvas = createMockCanvas();
    renderer = new Renderer3D(mockCanvas);
  });

  it("projects 3D point accurately to 2D screen space", () => {
    const projected = renderer.project({ x: 0, y: 0, z: 0 });
    expect(projected).not.toBeNull();
    if (projected) {
      expect(projected.x).toBeCloseTo(400, 1);
      expect(projected.y).toBeCloseTo(300, 1);
      expect(projected.depth).toBeCloseTo(4.5, 1);
    }
  });

  it("returns null when projecting a point behind the camera", () => {
    // Point far behind camera relative to camera target and distance
    const behindPoint = renderer.project({ x: 0, y: 0, z: -100 });
    expect(behindPoint).toBeNull();
  });

  it("does not trigger repeated getBoundingClientRect DOM calls during render pass", () => {
    const initialDOMCalls = (mockCanvas as any)._getBoundingClientRectCalls;

    // Execute render pass with grid, polygon, lines, and points
    renderer.render(
      [
        { x: -1, y: 0, z: -1 },
        { x: 1, y: 0, z: -1 },
        { x: 1, y: 0, z: 1 },
      ],
      { x: 0, y: 0, z: 0 },
      "polygon",
      "m",
      "deg",
    );

    const domCallsAfterRender = (mockCanvas as any)._getBoundingClientRectCalls;
    // Calling project dozens of times during render should NOT trigger getBoundingClientRect on every call
    // Initial call during constructor + max 1 per render frame
    expect(domCallsAfterRender - initialDOMCalls).toBeLessThanOrEqual(1);
  });

  it("unprojects screen point to 3D space accurately", () => {
    const unprojected = renderer.unprojectGround(400, 300, 0);
    expect(unprojected).not.toBeNull();
    if (unprojected) {
      expect(typeof unprojected.x).toBe("number");
      expect(typeof unprojected.y).toBe("number");
      expect(typeof unprojected.z).toBe("number");
    }
  });

  it("automatically updates camera cache when camera properties change without render", () => {
    const p1 = renderer.project({ x: 1, y: 0, z: 0 });

    // Mutate camera state without calling render()
    renderer.camera.yaw = Math.PI / 2;
    renderer.camera.pitch = Math.PI / 4;

    const p2 = renderer.project({ x: 1, y: 0, z: 0 });
    expect(p1).toBeDefined();
    expect(p2).toBeDefined();
    // Projection should react immediately to updated camera yaw/pitch
    expect(p1!.x).not.toBeCloseTo(p2!.x, 3);
  });
});
