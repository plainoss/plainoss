/**
 * Pure WebGL WebXR AR Ruler Engine with 3D Spatial Billboard Measurements
 * and Interactive 3D Handle Manipulation (Moving/Repositioning Anchors in AR).
 */

import {
  Point3D,
  distance3D,
  formatDistance,
  DistanceUnit,
} from "@plainoss/core";

export interface XREngineCallbacks {
  onPointPlaced: (point: Point3D, points: Point3D[]) => void;
  onSessionStarted: () => void;
  onSessionEnded: () => void;
  onScanningStateChange?: (isScanning: boolean) => void;
  onHandleHoverChange?: (index: number | null) => void;
  onHandleGrabbed?: (index: number, points: Point3D[]) => void;
  onHandleMoved?: (index: number, points: Point3D[]) => void;
  onHandleDropped?: (index: number, points: Point3D[]) => void;
}

export class WebXREngine {
  private gl: WebGL2RenderingContext | WebGLRenderingContext;
  private session: any = null;
  private refSpace: any = null;
  private hitTestSource: any = null;
  private isXRActive: boolean = false;
  private callbacks: XREngineCallbacks;

  // Shaders & Buffers
  private geometryProgram!: WebGLProgram;
  private billboardProgram!: WebGLProgram;
  private vertexBuffer!: WebGLBuffer;
  private quadBuffer!: WebGLBuffer;

  // Text Texture for 3D In-AR Measurement Label
  private textCanvas: HTMLCanvasElement;
  private textCtx: CanvasRenderingContext2D;
  private textTexture!: WebGLTexture;
  private lastRenderedText: string = "";

  // Measurement State
  public points: Point3D[] = [];
  public reticlePosition: Point3D | null = null;
  public reticleMatrix: Float32Array | null = null;
  public unit: DistanceUnit = "m";

  // Handle Editing State (Moving existing points in AR space)
  public draggedPointIndex: number | null = null;
  public hoveredHandleIndex: number | null = null;
  public suppressTapUntil: number = 0;

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

    // Create offscreen text canvas for dynamic 3D spatial billboard textures
    this.textCanvas = document.createElement("canvas");
    this.textCanvas.width = 512;
    this.textCanvas.height = 160;
    const ctx = this.textCanvas.getContext("2d");
    if (!ctx) {
      throw new Error("2D context for text canvas failed");
    }
    this.textCtx = ctx;

    this.initShaders();
    this.initTextTexture();
  }

  private initShaders(): void {
    const gl = this.gl;

    // 1. Geometry Shader (for 3D cylinders, spheres, torus reticle)
    const vsGeom = `
      attribute vec3 aPosition;
      uniform mat4 uProjectionMatrix;
      uniform mat4 uViewMatrix;
      uniform mat4 uModelMatrix;
      void main() {
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
      }
    `;

    const fsGeom = `
      precision mediump float;
      uniform vec4 uColor;
      void main() {
        gl_FragColor = uColor;
      }
    `;

    this.geometryProgram = this.createProgram(vsGeom, fsGeom);
    this.vertexBuffer = gl.createBuffer()!;

    // 2. Camera-facing 3D Spatial Billboard Shader (for in-AR distance text)
    const vsBillboard = `
      attribute vec2 aCorner;
      uniform mat4 uProjectionMatrix;
      uniform mat4 uViewMatrix;
      uniform vec3 uCenterPos;
      uniform vec2 uSize;
      varying vec2 vUv;
      void main() {
        // Invert vertical V coordinate to match 2D Canvas texture space
        vUv = vec2((aCorner.x + 1.0) * 0.5, (1.0 - aCorner.y) * 0.5);
        vec4 camCenter = uViewMatrix * vec4(uCenterPos, 1.0);
        vec4 camPos = camCenter + vec4(aCorner.x * uSize.x * 0.5, aCorner.y * uSize.y * 0.5, 0.0, 0.0);
        gl_Position = uProjectionMatrix * camPos;
      }
    `;

    const fsBillboard = `
      precision mediump float;
      uniform sampler2D uTexture;
      varying vec2 vUv;
      void main() {
        gl_FragColor = texture2D(uTexture, vUv);
      }
    `;

    this.billboardProgram = this.createProgram(vsBillboard, fsBillboard);
    this.quadBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    const quadVerts = new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);
  }

  private createProgram(vsSource: string, fsSource: string): WebGLProgram {
    const gl = this.gl;
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
    return program;
  }

  private initTextTexture(): void {
    const gl = this.gl;
    this.textTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.textTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.updateTextTexture("0.00 m");
  }

  private updateTextTexture(text: string): void {
    if (this.lastRenderedText === text) return;
    this.lastRenderedText = text;

    const ctx = this.textCtx;
    const w = this.textCanvas.width;
    const h = this.textCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Rounded badge background
    const r = 32;
    const pad = 16;
    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 8;

    ctx.beginPath();
    ctx.moveTo(pad + r, pad);
    ctx.lineTo(w - pad - r, pad);
    ctx.quadraticCurveTo(w - pad, pad, w - pad, pad + r);
    ctx.lineTo(w - pad, h - pad - r);
    ctx.quadraticCurveTo(w - pad, h - pad, w - pad - r, h - pad);
    ctx.lineTo(pad + r, h - pad);
    ctx.quadraticCurveTo(pad, h - pad, pad, h - pad - r);
    ctx.lineTo(pad, pad + r);
    ctx.quadraticCurveTo(pad, pad, pad + r, pad);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Measurement text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 74px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h / 2);

    // Upload to WebGL
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.textTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.textCanvas,
    );
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

  /**
   * Temporarily suppress XR screen taps (e.g. when tapping UI buttons like Clear or Exit).
   */
  public suppressTap(durationMs: number = 400): void {
    this.suppressTapUntil = Date.now() + durationMs;
  }

  /**
   * Finds the nearest anchor point index within a proximity radius.
   */
  public findNearbyPointIndex(
    pos: Point3D,
    threshold: number = 0.12,
  ): number | null {
    let bestIdx: number | null = null;
    let minD = threshold;
    for (let i = 0; i < this.points.length; i++) {
      const pt = this.points[i];
      if (pt) {
        const d = distance3D(pt, pos);
        if (d < minD) {
          minD = d;
          bestIdx = i;
        }
      }
    }
    return bestIdx;
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
        session = await xr.requestSession("immersive-ar", {
          requiredFeatures: ["hit-test"],
          optionalFeatures: ["dom-overlay", "local-floor"],
          domOverlay: { root: overlayElement },
        });
      } catch (domErr) {
        console.warn("dom-overlay fallback:", domErr);
      }
    }

    if (!session) {
      session = await xr.requestSession("immersive-ar", {
        requiredFeatures: ["hit-test"],
        optionalFeatures: ["local-floor"],
      });
    }

    this.session = session;
    this.isXRActive = true;
    this.draggedPointIndex = null;
    this.hoveredHandleIndex = null;

    const baseLayer = new (window as any).XRWebGLLayer(session, this.gl);
    await session.updateRenderState({ baseLayer });

    const refSpace = await session.requestReferenceSpace("local");
    const viewerSpace = await session.requestReferenceSpace("viewer");
    const hitTestSource = await session.requestHitTestSource({
      space: viewerSpace,
    });

    this.refSpace = refSpace;
    this.hitTestSource = hitTestSource;

    // Handle screen tap (select event) for placing or moving handles
    session.addEventListener("select", (e: any) => {
      // 1. Ignore if user tapped a DOM UI control
      if (Date.now() < this.suppressTapUntil) {
        return;
      }
      if (
        e.inputSource &&
        e.inputSource.targetRayMode === "transient-pointer" &&
        e.isOverlaySelect
      ) {
        return;
      }

      // 2. If currently dragging a handle -> Drop & Lock at current reticle position
      if (this.draggedPointIndex !== null) {
        if (this.reticlePosition) {
          this.points[this.draggedPointIndex] = { ...this.reticlePosition };
        }
        const droppedIdx = this.draggedPointIndex;
        this.draggedPointIndex = null;
        this.callbacks.onHandleDropped?.(droppedIdx, this.points);
        return;
      }

      // 3. If hovering near an existing handle -> Grab handle to move it
      if (this.reticlePosition && this.points.length > 0) {
        const nearbyIdx = this.findNearbyPointIndex(this.reticlePosition, 0.12);
        if (nearbyIdx !== null) {
          this.draggedPointIndex = nearbyIdx;
          this.callbacks.onHandleGrabbed?.(nearbyIdx, this.points);
          return;
        }
      }

      // 4. Otherwise -> Normal point placement
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
      this.draggedPointIndex = null;
      this.hoveredHandleIndex = null;
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
          this.callbacks.onScanningStateChange?.(false);

          // If dragging a handle, update its position with the live reticle
          if (this.draggedPointIndex !== null) {
            this.points[this.draggedPointIndex] = { ...this.reticlePosition };
            this.callbacks.onHandleMoved?.(this.draggedPointIndex, this.points);
          } else {
            // Check if hovering near an existing handle
            const nearby = this.findNearbyPointIndex(
              this.reticlePosition,
              0.12,
            );
            if (nearby !== this.hoveredHandleIndex) {
              this.hoveredHandleIndex = nearby;
              this.callbacks.onHandleHoverChange?.(nearby);
            }
          }
        }
      } else {
        this.reticlePosition = null;
        this.reticleMatrix = null;
        this.callbacks.onScanningStateChange?.(true);
        if (this.hoveredHandleIndex !== null) {
          this.hoveredHandleIndex = null;
          this.callbacks.onHandleHoverChange?.(null);
        }
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
      this.draggedPointIndex = null;
      this.hoveredHandleIndex = null;
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
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // ==========================================
    // 1. RENDER 3D GEOMETRY (Torus Reticle, 3D Tubes, Spheres)
    // ==========================================
    gl.useProgram(this.geometryProgram);

    const uProj = gl.getUniformLocation(
      this.geometryProgram,
      "uProjectionMatrix",
    );
    const uView = gl.getUniformLocation(this.geometryProgram, "uViewMatrix");
    const uModel = gl.getUniformLocation(this.geometryProgram, "uModelMatrix");
    const uColor = gl.getUniformLocation(this.geometryProgram, "uColor");

    gl.uniformMatrix4fv(uProj, false, projectionMatrix);
    gl.uniformMatrix4fv(uView, false, viewMatrix);

    const identity = new Float32Array([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ]);
    gl.uniformMatrix4fv(uModel, false, identity);

    const posAttr = gl.getAttribLocation(this.geometryProgram, "aPosition");
    gl.enableVertexAttribArray(posAttr);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(posAttr, 3, gl.FLOAT, false, 0, 0);

    // 1a. Surface Reticle (Volumetric 3D Torus)
    if (this.reticleMatrix) {
      gl.uniformMatrix4fv(uModel, false, this.reticleMatrix);

      // Color reticle cyan, or yellow if hovering near a handle, or green if dragging
      if (this.draggedPointIndex !== null) {
        gl.uniform4f(uColor, 0.13, 0.77, 0.36, 0.95); // Green when dragging
      } else if (this.hoveredHandleIndex !== null) {
        gl.uniform4f(uColor, 0.98, 0.75, 0.18, 0.95); // Gold when over a handle
      } else {
        gl.uniform4f(uColor, 0.22, 0.74, 0.97, 0.95); // Cyan standard
      }

      const torusVerts = this.createTorusMesh(0.075, 0.005, 24, 8);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(torusVerts),
        gl.DYNAMIC_DRAW,
      );
      gl.drawArrays(gl.TRIANGLES, 0, torusVerts.length / 3);

      // Center dot sphere
      const dotVerts = this.createSphereMesh({ x: 0, y: 0, z: 0 }, 0.008, 8);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(dotVerts),
        gl.DYNAMIC_DRAW,
      );
      gl.drawArrays(gl.TRIANGLES, 0, dotVerts.length / 3);

      gl.uniformMatrix4fv(uModel, false, identity);
    }

    let measurementMidpoint: Point3D | null = null;
    let currentDistanceValue: number = 0;

    // 1b. Live Guidance Line (Point 1 -> Reticle)
    if (
      this.points.length === 1 &&
      this.points[0] &&
      this.reticlePosition &&
      this.draggedPointIndex === null
    ) {
      gl.uniform4f(uColor, 0.22, 0.74, 0.97, 0.8); // Glowing Cyan Tube

      const tubeVerts = this.createCylinderMesh(
        this.points[0],
        this.reticlePosition,
        0.006,
      );
      if (tubeVerts.length > 0) {
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(tubeVerts),
          gl.DYNAMIC_DRAW,
        );
        gl.drawArrays(gl.TRIANGLES, 0, tubeVerts.length / 3);
      }

      currentDistanceValue = distance3D(this.points[0], this.reticlePosition);
      measurementMidpoint = {
        x: (this.points[0].x + this.reticlePosition.x) / 2,
        y: (this.points[0].y + this.reticlePosition.y) / 2 + 0.04, // 4cm above line
        z: (this.points[0].z + this.reticlePosition.z) / 2,
      };
    }

    // 1c. Locked / Active Measurement Line (Point 1 -> Point 2)
    if (this.points.length >= 2 && this.points[0] && this.points[1]) {
      gl.uniform4f(uColor, 0.23, 0.51, 0.96, 1.0); // Bold Blue Tube

      const tubeVerts = this.createCylinderMesh(
        this.points[0],
        this.points[1],
        0.009,
      );
      if (tubeVerts.length > 0) {
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(tubeVerts),
          gl.DYNAMIC_DRAW,
        );
        gl.drawArrays(gl.TRIANGLES, 0, tubeVerts.length / 3);
      }

      currentDistanceValue = distance3D(this.points[0], this.points[1]);
      measurementMidpoint = {
        x: (this.points[0].x + this.points[1].x) / 2,
        y: (this.points[0].y + this.points[1].y) / 2 + 0.04,
        z: (this.points[0].z + this.points[1].z) / 2,
      };
    }

    // 1d. Render 3D Handles / Anchor Spheres
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      if (!p) continue;

      const isDragged = this.draggedPointIndex === i;
      const isHovered = this.hoveredHandleIndex === i;

      if (isDragged) {
        gl.uniform4f(uColor, 0.13, 0.77, 0.36, 1.0); // Bright Green when dragging
        const verts = this.createSphereMesh(p, 0.024, 12);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(verts),
          gl.DYNAMIC_DRAW,
        );
        gl.drawArrays(gl.TRIANGLES, 0, verts.length / 3);
      } else if (isHovered) {
        gl.uniform4f(uColor, 0.98, 0.75, 0.18, 1.0); // Large Golden Pulsing Handle
        const verts = this.createSphereMesh(p, 0.022, 12);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(verts),
          gl.DYNAMIC_DRAW,
        );
        gl.drawArrays(gl.TRIANGLES, 0, verts.length / 3);
      } else {
        gl.uniform4f(uColor, 0.98, 0.75, 0.18, 0.9); // Normal Gold Anchor Sphere
        const verts = this.createSphereMesh(p, 0.016, 10);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(verts),
          gl.DYNAMIC_DRAW,
        );
        gl.drawArrays(gl.TRIANGLES, 0, verts.length / 3);
      }
    }

    // ==========================================
    // 2. RENDER 3D IN-AR SPATIAL BILLBOARD LABEL
    // ==========================================
    if (measurementMidpoint && currentDistanceValue > 0.001) {
      const formattedText = formatDistance(currentDistanceValue, this.unit, 2);
      this.updateTextTexture(formattedText);

      gl.useProgram(this.billboardProgram);

      const uBillProj = gl.getUniformLocation(
        this.billboardProgram,
        "uProjectionMatrix",
      );
      const uBillView = gl.getUniformLocation(
        this.billboardProgram,
        "uViewMatrix",
      );
      const uBillCenter = gl.getUniformLocation(
        this.billboardProgram,
        "uCenterPos",
      );
      const uBillSize = gl.getUniformLocation(this.billboardProgram, "uSize");
      const uBillTex = gl.getUniformLocation(this.billboardProgram, "uTexture");

      gl.uniformMatrix4fv(uBillProj, false, projectionMatrix);
      gl.uniformMatrix4fv(uBillView, false, viewMatrix);
      gl.uniform3f(
        uBillCenter,
        measurementMidpoint.x,
        measurementMidpoint.y,
        measurementMidpoint.z,
      );
      gl.uniform2f(uBillSize, 0.18, 0.055);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.textTexture);
      gl.uniform1i(uBillTex, 0);

      const cornerAttr = gl.getAttribLocation(this.billboardProgram, "aCorner");
      gl.enableVertexAttribArray(cornerAttr);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
      gl.vertexAttribPointer(cornerAttr, 2, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

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
