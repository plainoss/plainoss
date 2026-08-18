/**
 * Clean, Bloat-Free WebGL WebXR Point-to-Point AR Ruler Engine
 * Implements W3C WebXR Immersive AR Hit-Testing with ARCore pose tracking.
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

  // Shader programs & buffers
  private colorProgram!: WebGLProgram;
  private positionBuffer!: WebGLBuffer;

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
        gl_PointSize = 20.0;
      }
    `;

    const fsSource = `
      precision mediump float;
      uniform vec4 uColor;
      uniform bool uIsPoint;
      void main() {
        if (uIsPoint) {
          vec2 coord = gl_PointCoord - vec2(0.5);
          if (length(coord) > 0.5) discard;
        }
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
    this.positionBuffer = gl.createBuffer()!;
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

    const sessionInit: any = {
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["dom-overlay", "local-floor"],
    };

    if (overlayElement) {
      sessionInit.optionalFeatures.push("dom-overlay");
      sessionInit.domOverlay = { root: overlayElement };
    }

    const session = await xr.requestSession("immersive-ar", sessionInit);
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

    // Handle screen tap (select event) to anchor point
    session.addEventListener("select", () => {
      if (this.reticlePosition) {
        const pt = { ...this.reticlePosition };
        if (this.points.length >= 2) {
          // Reset on 3rd tap to start a new line measurement
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

          // Compute live distance from Point 1 to reticle
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

      // Render WebXR scene into XRWebGLLayer framebuffer
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
    const uIsPoint = gl.getUniformLocation(this.colorProgram, "uIsPoint");

    gl.uniformMatrix4fv(uProj, false, projectionMatrix);
    gl.uniformMatrix4fv(uView, false, viewMatrix);

    const identity = new Float32Array([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ]);
    gl.uniformMatrix4fv(uModel, false, identity);

    const posAttr = gl.getAttribLocation(this.colorProgram, "aPosition");
    gl.enableVertexAttribArray(posAttr);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.vertexAttribPointer(posAttr, 3, gl.FLOAT, false, 0, 0);

    // 1. Draw Surface Reticle Ring
    if (this.reticleMatrix) {
      gl.uniformMatrix4fv(uModel, false, this.reticleMatrix);
      gl.uniform1i(uIsPoint, 0);
      gl.uniform4f(uColor, 0.22, 0.74, 0.97, 0.95);

      const ringVerts: number[] = [];
      const segments = 32;
      const radius = 0.08; // 8cm radius
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        ringVerts.push(Math.cos(theta) * radius, 0, Math.sin(theta) * radius);
      }
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(ringVerts),
        gl.DYNAMIC_DRAW,
      );
      gl.drawArrays(gl.LINE_LOOP, 0, segments + 1);

      gl.uniformMatrix4fv(uModel, false, identity);
    }

    // 2. Draw Point 1 -> Reticle Live Guidance Line
    if (this.points.length === 1 && this.points[0] && this.reticlePosition) {
      gl.uniform1i(uIsPoint, 0);
      gl.uniform4f(uColor, 0.22, 0.74, 0.97, 0.7);

      const p0 = this.points[0];
      const pr = this.reticlePosition;
      const liveLineVerts = [p0.x, p0.y, p0.z, pr.x, pr.y, pr.z];
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(liveLineVerts),
        gl.DYNAMIC_DRAW,
      );
      gl.drawArrays(gl.LINES, 0, 2);
    }

    // 3. Draw Completed Measured Line between Point 1 and Point 2
    if (this.points.length >= 2 && this.points[0] && this.points[1]) {
      gl.uniform1i(uIsPoint, 0);
      gl.uniform4f(uColor, 0.23, 0.51, 0.96, 1.0);

      const p0 = this.points[0];
      const p1 = this.points[1];
      const lineVerts = [p0.x, p0.y, p0.z, p1.x, p1.y, p1.z];
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(lineVerts),
        gl.DYNAMIC_DRAW,
      );
      gl.drawArrays(gl.LINES, 0, 2);
    }

    // 4. Draw Placed Points
    if (this.points.length > 0) {
      gl.uniform1i(uIsPoint, 1);
      gl.uniform4f(uColor, 0.98, 0.75, 0.18, 1.0); // Gold points

      const pointVerts: number[] = [];
      for (const p of this.points) {
        pointVerts.push(p.x, p.y, p.z);
      }
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(pointVerts),
        gl.DYNAMIC_DRAW,
      );
      gl.drawArrays(gl.POINTS, 0, this.points.length);
    }
  }
}
