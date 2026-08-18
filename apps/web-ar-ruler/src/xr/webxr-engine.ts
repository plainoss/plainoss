/**
 * Clean, High-Visibility 3D WebGL WebXR AR Ruler Engine
 * Generates 3D volumetric cylinder laser tubes, physical marker spheres,
 * and torus reticles for guaranteed thick, visible lines in AR space.
 */

import { Point3D, distance3D } from "@plainoss/core";

export interface XREngineCallbacks {
  onHitPoseChange: (pose: Point3D | null, liveDistance: number | null) => void;
  onPointPlaced: (point: Point3D, currentPoints: Point3D[]) => void;
  onSessionStarted: () => void;
  onSessionEnded: () => void;
}

export class WebXREngine {
  private gl: WebGL2RenderingContext | WebGLRenderingContext;
  private session: any = null;
  private refSpace: any = null;
  private hitTestSource: any = null;
  private isXRActive: boolean = false;
  private callbacks: XREngineCallbacks;

  // Shader program & buffers
  private colorProgram!: WebGLProgram;
  private vertexBuffer!: WebGLBuffer;

  // Measurement State
  public points: Point3D[] = [];
  public reticlePosition: Point3D | null = null;
  public reticleMatrix: Float32Array | null = null;

  constructor(canvas: HTMLCanvasElement, callbacks: XREngineCallbacks) {
    this.callbacks = callbacks;

    const gl =
      canvas.getContext("webgl2", {
        xrCompatible: true,
        alpha: true,
        antialias: true,
      }) ||
      canvas.getContext("webgl", {
        xrCompatible: true,
        alpha: true,
        antialias: true,
      });

    if (!gl) {
      throw new Error("WebGL not supported for WebXR");
    }
    this.gl = gl as WebGL2RenderingContext;
    this.initShaders();
  }

  private initShaders(): void {
    const gl = this.gl;

    const vsSource = `
      attribute vec3 aPosition;
      uniform mat4 uProjectionMatrix;
      uniform mat4 uViewMatrix;
      uniform mat4 uModelMatrix;
      void main() {
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
      }
    `;

    const fsSource = `
      precision mediump float;
      uniform vec4 uColor;
      void main() {
        gl_FragColor = uColor;
      }
    `;

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    this.colorProgram = program;
    this.vertexBuffer = gl.createBuffer()!;
  }

  public static async isSupported(): Promise<boolean> {
    if (typeof window === "undefined" || !("xr" in navigator)) {
      return false;
    }
    try {
      return await (navigator as any).xr.isSessionSupported("immersive-ar");
    } catch {
      return false;
    }
  }

  public async startAR(overlayElement?: HTMLElement): Promise<void> {
    if (this.session) {
      await this.endAR();
    }

    const xr = (navigator as any).xr;
    if (!xr) {
      throw new Error("WebXR API not available in this browser");
    }

    if ("makeXRCompatible" in this.gl) {
      await (this.gl as any).makeXRCompatible();
    }

    let session: any = null;

    if (overlayElement) {
      try {
        session = await xr.requestSession('immersive-ar', {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay', 'local-floor'],
          domOverlay: { root: overlayElement },
        });
      } catch (domErr) {
        console.warn('dom-overlay not supported by XR runtime, requesting pure immersive-ar:', domErr);
      }
    }

    if (!session) {
      session = await xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['local-floor'],
      });
    }

    this.session = session;
    this.isXRActive = true;

    const baseLayer = new (window as any).XRWebGLLayer(session, this.gl);
    await session.updateRenderState({ baseLayer });

    const refSpace = await session.requestReferenceSpace("local");
    const viewerSpace = await session.requestReferenceSpace("viewer");
    const hitTestSource = await session.requestHitTestSource({
      space: viewerSpace,
    });

    this.refSpace = refSpace;
    this.hitTestSource = hitTestSource;

    // Handle screen tap to drop points
    session.addEventListener("select", () => {
      if (this.reticlePosition) {
        const pt = { ...this.reticlePosition };
        if (this.points.length >= 2) {
          this.points = [pt];
        } else {
          this.points = [...this.points, pt];
        }
        this.callbacks.onPointPlaced(pt, this.points);
      }
    });

    session.addEventListener("end", () => {
      this.isXRActive = false;
      this.session = null;
      this.hitTestSource = null;
      this.callbacks.onSessionEnded();
    });

    this.callbacks.onSessionStarted();

    const onXRFrame = (_time: number, frame: any) => {
      if (!this.session || !this.isXRActive) return;

      const gl = this.gl;
      const hitTestResults = frame.getHitTestResults(this.hitTestSource);

      if (hitTestResults && hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(this.refSpace);
        if (pose) {
          const pos = pose.transform.position;
          this.reticlePosition = { x: pos.x, y: pos.y, z: pos.z };
          this.reticleMatrix = pose.transform.matrix;

          let liveDist: number | null = null;
          if (this.points.length === 1 && this.points[0]) {
            liveDist = distance3D(this.points[0], this.reticlePosition);
          }
          this.callbacks.onHitPoseChange(this.reticlePosition, liveDist);
        }
      } else {
        this.reticlePosition = null;
        this.reticleMatrix = null;
        this.callbacks.onHitPoseChange(null, null);
      }

      // Render WebXR Scene
      const pose = frame.getViewerPose(this.refSpace);
      if (pose) {
        const layer = session.renderState.baseLayer;
        gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (const view of pose.views) {
          const viewport = layer.getViewport(view);
          gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

          this.renderScene(
            view.projectionMatrix,
            view.transform.inverse.matrix,
          );
        }
      }

      session.requestAnimationFrame(onXRFrame);
    };

    session.requestAnimationFrame(onXRFrame);
  }

  public async endAR(): Promise<void> {
    if (this.session) {
      try {
        await this.session.end();
      } catch {
        // Ignore session end errors
      }
      this.session = null;
      this.isXRActive = false;
    }
  }

  public get active(): boolean {
    return this.isXRActive;
  }

  private renderScene(
    projectionMatrix: Float32Array,
    viewMatrix: Float32Array,
  ): void {
    const gl = this.gl;
    gl.useProgram(this.colorProgram);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const uProj = gl.getUniformLocation(this.colorProgram, "uProjectionMatrix");
    const uView = gl.getUniformLocation(this.colorProgram, "uViewMatrix");
    const uModel = gl.getUniformLocation(this.colorProgram, "uModelMatrix");
    const uColor = gl.getUniformLocation(this.colorProgram, "uColor");

    gl.uniformMatrix4fv(uProj, false, projectionMatrix);
    gl.uniformMatrix4fv(uView, false, viewMatrix);

    const identity = new Float32Array([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ]);
    gl.uniformMatrix4fv(uModel, false, identity);

    const posAttr = gl.getAttribLocation(this.colorProgram, "aPosition");
    gl.enableVertexAttribArray(posAttr);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(posAttr, 3, gl.FLOAT, false, 0, 0);

    // 1. Draw Surface Reticle as a Volumetric 3D Torus Ring
    if (this.reticleMatrix) {
      gl.uniformMatrix4fv(uModel, false, this.reticleMatrix);
      gl.uniform4f(uColor, 0.22, 0.74, 0.97, 0.95);

      const torusVerts = this.createTorusMesh(0.08, 0.006, 24, 8);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(torusVerts),
        gl.DYNAMIC_DRAW,
      );
      gl.drawArrays(gl.TRIANGLES, 0, torusVerts.length / 3);

      // Center dot sphere
      const dotVerts = this.createSphereMesh({ x: 0, y: 0, z: 0 }, 0.01, 8);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(dotVerts),
        gl.DYNAMIC_DRAW,
      );
      gl.drawArrays(gl.TRIANGLES, 0, dotVerts.length / 3);

      gl.uniformMatrix4fv(uModel, false, identity);
    }

    // 2. Draw Point 1 -> Reticle Live Guidance Line (Thick 3D Cylinder Tube)
    if (this.points.length === 1 && this.points[0] && this.reticlePosition) {
      gl.uniform4f(uColor, 0.22, 0.74, 0.97, 0.75); // Glowing Cyan Line

      const tubeVerts = this.createCylinderMesh(
        this.points[0],
        this.reticlePosition,
        0.007,
      );
      if (tubeVerts.length > 0) {
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(tubeVerts),
          gl.DYNAMIC_DRAW,
        );
        gl.drawArrays(gl.TRIANGLES, 0, tubeVerts.length / 3);
      }
    }

    // 3. Draw Completed Measured Line between Point 1 and Point 2 (Bold 3D Cylinder Tube)
    if (this.points.length >= 2 && this.points[0] && this.points[1]) {
      gl.uniform4f(uColor, 0.23, 0.51, 0.96, 1.0); // Bold Blue Line

      const tubeVerts = this.createCylinderMesh(
        this.points[0],
        this.points[1],
        0.01,
      );
      if (tubeVerts.length > 0) {
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(tubeVerts),
          gl.DYNAMIC_DRAW,
        );
        gl.drawArrays(gl.TRIANGLES, 0, tubeVerts.length / 3);
      }
    }

    // 4. Draw Placed 3D Spheres for Anchors
    if (this.points.length > 0) {
      gl.uniform4f(uColor, 0.98, 0.75, 0.18, 1.0); // Bright Gold Spheres

      const sphereVerts: number[] = [];
      for (const p of this.points) {
        sphereVerts.push(...this.createSphereMesh(p, 0.02, 10));
      }
      if (sphereVerts.length > 0) {
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(sphereVerts),
          gl.DYNAMIC_DRAW,
        );
        gl.drawArrays(gl.TRIANGLES, 0, sphereVerts.length / 3);
      }
    }
  }

  /**
   * Generates a 3D cylinder tube between two endpoints for bold, resolution-independent 3D lines.
   */
  private createCylinderMesh(
    p1: Point3D,
    p2: Point3D,
    radius: number,
  ): number[] {
    const dir = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
    const len = Math.hypot(dir.x, dir.y, dir.z);
    if (len < 0.001) return [];

    const nd = { x: dir.x / len, y: dir.y / len, z: dir.z / len };
    let up = { x: 0, y: 1, z: 0 };
    if (Math.abs(nd.y) > 0.9) {
      up = { x: 1, y: 0, z: 0 };
    }

    const rx = up.y * nd.z - up.z * nd.y;
    const ry = up.z * nd.x - up.x * nd.z;
    const rz = up.x * nd.y - up.y * nd.x;
    const rLen = Math.hypot(rx, ry, rz) || 1;
    const nr = { x: rx / rLen, y: ry / rLen, z: rz / rLen };

    const ux = nd.y * nr.z - nd.z * nr.y;
    const uy = nd.z * nr.x - nd.x * nr.z;
    const uz = nd.x * nr.y - nd.y * nr.x;
    const nu = { x: ux, y: uy, z: uz };

    const segments = 8;
    const verts: number[] = [];
    const ring1: Point3D[] = [];
    const ring2: Point3D[] = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const cos = Math.cos(angle) * radius;
      const sin = Math.sin(angle) * radius;
      const ox = nr.x * cos + nu.x * sin;
      const oy = nr.y * cos + nu.y * sin;
      const oz = nr.z * cos + nu.z * sin;
      ring1.push({ x: p1.x + ox, y: p1.y + oy, z: p1.z + oz });
      ring2.push({ x: p2.x + ox, y: p2.y + oy, z: p2.z + oz });
    }

    for (let i = 0; i < segments; i++) {
      const a1 = ring1[i]!;
      const a2 = ring1[i + 1]!;
      const b1 = ring2[i]!;
      const b2 = ring2[i + 1]!;

      verts.push(a1.x, a1.y, a1.z, b1.x, b1.y, b1.z, a2.x, a2.y, a2.z);
      verts.push(a2.x, a2.y, a2.z, b1.x, b1.y, b1.z, b2.x, b2.y, b2.z);
    }

    return verts;
  }

  /**
   * Generates a 3D Sphere mesh at a given center.
   */
  private createSphereMesh(
    center: Point3D,
    radius: number,
    segments: number = 8,
  ): number[] {
    const verts: number[] = [];
    for (let lat = 0; lat < segments; lat++) {
      const theta1 = (lat / segments) * Math.PI;
      const theta2 = ((lat + 1) / segments) * Math.PI;

      for (let lon = 0; lon < segments; lon++) {
        const phi1 = (lon / segments) * Math.PI * 2;
        const phi2 = ((lon + 1) / segments) * Math.PI * 2;

        const p1 = this.spherePoint(center, radius, theta1, phi1);
        const p2 = this.spherePoint(center, radius, theta1, phi2);
        const p3 = this.spherePoint(center, radius, theta2, phi1);
        const p4 = this.spherePoint(center, radius, theta2, phi2);

        verts.push(p1.x, p1.y, p1.z, p3.x, p3.y, p3.z, p2.x, p2.y, p2.z);
        verts.push(p2.x, p2.y, p2.z, p3.x, p3.y, p3.z, p4.x, p4.y, p4.z);
      }
    }
    return verts;
  }

  private spherePoint(
    center: Point3D,
    radius: number,
    theta: number,
    phi: number,
  ): Point3D {
    return {
      x: center.x + radius * Math.sin(theta) * Math.cos(phi),
      y: center.y + radius * Math.cos(theta),
      z: center.z + radius * Math.sin(theta) * Math.sin(phi),
    };
  }

  /**
   * Generates a 3D Torus ring mesh for the surface reticle.
   */
  private createTorusMesh(
    radius: number,
    tubeRadius: number,
    radialSegments: number = 24,
    tubularSegments: number = 8,
  ): number[] {
    const verts: number[] = [];

    for (let j = 0; j < radialSegments; j++) {
      const u1 = (j / radialSegments) * Math.PI * 2;
      const u2 = ((j + 1) / radialSegments) * Math.PI * 2;

      for (let i = 0; i < tubularSegments; i++) {
        const v1 = (i / tubularSegments) * Math.PI * 2;
        const v2 = ((i + 1) / tubularSegments) * Math.PI * 2;

        const p1 = this.torusPoint(u1, v1, radius, tubeRadius);
        const p2 = this.torusPoint(u2, v1, radius, tubeRadius);
        const p3 = this.torusPoint(u1, v2, radius, tubeRadius);
        const p4 = this.torusPoint(u2, v2, radius, tubeRadius);

        verts.push(p1.x, p1.y, p1.z, p3.x, p3.y, p3.z, p2.x, p2.y, p2.z);
        verts.push(p2.x, p2.y, p2.z, p3.x, p3.y, p3.z, p4.x, p4.y, p4.z);
      }
    }

    return verts;
  }

  private torusPoint(u: number, v: number, r: number, tubeR: number): Point3D {
    const x = (r + tubeR * Math.cos(v)) * Math.cos(u);
    const y = tubeR * Math.sin(v);
    const z = (r + tubeR * Math.cos(v)) * Math.sin(u);
    return { x, y, z };
  }
}
