/**
 * Pure WebGL WebXR AR Ruler Engine
 * Visualizes high-visibility room-scale physical surface plane grid matrix across detected floors/surfaces,
 * a clean minimalist placement pointer when surface is detected,
 * and 3D volumetric laser measurement lines with interactive handles.
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

const IDENTITY_MATRIX = new Float32Array([
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
]);

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
  private pointCloudProgram!: WebGLProgram;

  private vertexBuffer!: WebGLBuffer;
  private quadBuffer!: WebGLBuffer;
  private pointCloudBuffer!: WebGLBuffer;

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

  // Room-Scale Surface Plane Tracking
  private detectedGroundY: number | null = null;

  // Handle Editing State (Moving existing points in AR space)
  public draggedPointIndex: number | null = null;
  public hoveredHandleIndex: number | null = null;
  public suppressTapUntil: number = 0;

  // Precomputed static geometry & reusable Float32Array buffers (zero per-frame allocations)
  private staticCachedTorusVerts!: Float32Array;
  private staticCachedDotVerts!: Float32Array;
  private staticUnitSphereVerts!: Float32Array;
  private handleModelMatrix = new Float32Array([
    1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
  ]);

  private cylinderBuffer = new Float32Array(144); // 8 segments * 2 tris * 3 verts * 3 coords
  private ring1X = new Float32Array(9);
  private ring1Y = new Float32Array(9);
  private ring1Z = new Float32Array(9);
  private ring2X = new Float32Array(9);
  private ring2Y = new Float32Array(9);
  private ring2Z = new Float32Array(9);

  private gridBuffer = new Float32Array(8000); // Max dots ~ 1849 * 4 coords = 7396
  private measurementMidpoint: Point3D = { x: 0, y: 0, z: 0 };

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
    this.initStaticGeometries();
  }

  private initStaticGeometries(): void {
    const torusVerts = this.createTorusMesh(0.06, 0.0035, 28, 8);
    this.staticCachedTorusVerts = new Float32Array(torusVerts);

    const dotVerts = this.createSphereMesh({ x: 0, y: 0, z: 0 }, 0.006, 8);
    this.staticCachedDotVerts = new Float32Array(dotVerts);

    const unitSphereVerts = this.createSphereMesh(
      { x: 0, y: 0, z: 0 },
      1.0,
      12,
    );
    this.staticUnitSphereVerts = new Float32Array(unitSphereVerts);
  }

  private initShaders(): void {
    const gl = this.gl;

    // 1. Geometry Shader (for 3D cylinders, spheres, clean reticle ring)
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

    // 3. High-Visibility 3D Light-Dot Surface Grid Shader
    const vsPointCloud = `
      attribute vec3 aPosition;
      attribute float aAlpha;
      uniform mat4 uProjectionMatrix;
      uniform mat4 uViewMatrix;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha;
        vec4 viewPos = uViewMatrix * vec4(aPosition, 1.0);
        gl_Position = uProjectionMatrix * viewPos;
        float dist = max(0.3, -viewPos.z);
        gl_PointSize = clamp(220.0 / dist, 10.0, 36.0);
      }
    `;

    const fsPointCloud = `
      precision mediump float;
      varying float vAlpha;
      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        if (dist > 0.5) discard;
        float glow = smoothstep(0.5, 0.0, dist);
        float core = smoothstep(0.22, 0.0, dist);
        float alpha = (glow * 0.5 + core * 0.5) * vAlpha;
        vec3 col = mix(vec3(0.22, 0.74, 0.97), vec3(1.0, 1.0, 1.0), core);
        gl_FragColor = vec4(col, alpha);
      }
    `;

    this.pointCloudProgram = this.createProgram(vsPointCloud, fsPointCloud);
    this.pointCloudBuffer = gl.createBuffer()!;
  }

  /**
   * Generates a high-visibility room-scale planar grid of light dots across the entire detected physical floor.
   * Populates a pre-allocated Float32Array buffer to avoid garbage collection allocations during rendering.
   */
  private generateRoomPlaneGrid(
    timeSec: number,
    camPos: Point3D,
  ): Float32Array {
    const groundY =
      this.reticlePosition !== null
        ? this.reticlePosition.y
        : this.detectedGroundY !== null
          ? this.detectedGroundY
          : camPos.y - 0.65;

    const spacing = 0.15; // 15cm grid pitch
    const maxRadius = 3.2; // 3.2m radius

    const snapX = Math.round(camPos.x / spacing) * spacing;
    const snapZ = Math.round(camPos.z / spacing) * spacing;
    const steps = Math.floor(maxRadius / spacing);

    let offset = 0;
    const buf = this.gridBuffer;

    for (let ix = -steps; ix <= steps; ix++) {
      for (let iz = -steps; iz <= steps; iz++) {
        const wx = snapX + ix * spacing;
        const wz = snapZ + iz * spacing;

        const dx = wx - camPos.x;
        const dz = wz - camPos.z;
        const distFromCam = Math.sqrt(dx * dx + dz * dz);
        if (distFromCam > maxRadius) continue;

        // Bright, high-visibility radial falloff & subtle ripple
        const radialFalloff = Math.max(0, 1.0 - distFromCam / maxRadius);
        const subtleWave =
          0.75 + 0.25 * Math.sin(distFromCam * 6.0 - timeSec * 2.0);
        const alpha = Math.min(1.0, radialFalloff * subtleWave * 0.85);

        if (alpha < 0.04) continue;

        if (offset + 4 <= buf.length) {
          buf[offset++] = wx;
          buf[offset++] = groundY;
          buf[offset++] = wz;
          buf[offset++] = alpha;
        }
      }
    }

    return buf.subarray(0, offset);
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
   * Updates measurement unit and invalidates rendered text texture.
   */
  public setUnit(newUnit: DistanceUnit): void {
    this.unit = newUnit;
    this.lastRenderedText = "";
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
          optionalFeatures: ["dom-overlay", "local-floor", "plane-detection"],
          domOverlay: { root: overlayElement },
        });
      } catch (domErr) {
        console.warn("dom-overlay fallback:", domErr);
      }
    }

    if (!session) {
      session = await xr.requestSession("immersive-ar", {
        requiredFeatures: ["hit-test"],
        optionalFeatures: ["local-floor", "plane-detection"],
      });
    }

    this.session = session;
    this.isXRActive = true;
    this.draggedPointIndex = null;
    this.hoveredHandleIndex = null;
    this.detectedGroundY = null;

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
      this.detectedGroundY = null;
      this.callbacks.onSessionEnded();
    });

    this.callbacks.onSessionStarted();

    const onXRFrame = (time: number, frame: any) => {
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
          this.detectedGroundY = pos.y;
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

        const timeSec = time * 0.001;
        const camPos = pose.transform.position;

        // Generate high-visibility room-scale physical surface grid dots
        const roomDots = this.generateRoomPlaneGrid(timeSec, camPos);

        for (const view of pose.views) {
          const viewport = layer.getViewport(view);
          gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

          this.renderScene(
            view.projectionMatrix,
            view.transform.inverse.matrix,
            roomDots,
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
      this.detectedGroundY = null;
    }
  }

  public get active(): boolean {
    return this.isXRActive;
  }

  private renderScene(
    projectionMatrix: Float32Array,
    viewMatrix: Float32Array,
    roomGridDots: Float32Array,
  ): void {
    const gl = this.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // ==========================================
    // 1. RENDER SCANNING LIGHT-DOT SURFACE GRID (Active ONLY while scanning for surfaces)
    // ==========================================
    if (roomGridDots.length > 0 && !this.reticleMatrix) {
      // Disable depth write so particles blend crisply on top of camera without depth clipping
      gl.depthMask(false);
      gl.useProgram(this.pointCloudProgram);

      const uProj = gl.getUniformLocation(
        this.pointCloudProgram,
        "uProjectionMatrix",
      );
      const uView = gl.getUniformLocation(
        this.pointCloudProgram,
        "uViewMatrix",
      );
      gl.uniformMatrix4fv(uProj, false, projectionMatrix);
      gl.uniformMatrix4fv(uView, false, viewMatrix);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.pointCloudBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, roomGridDots, gl.DYNAMIC_DRAW);

      const posAttr = gl.getAttribLocation(this.pointCloudProgram, "aPosition");
      const alphaAttr = gl.getAttribLocation(this.pointCloudProgram, "aAlpha");

      gl.enableVertexAttribArray(posAttr);
      gl.vertexAttribPointer(posAttr, 3, gl.FLOAT, false, 16, 0);

      gl.enableVertexAttribArray(alphaAttr);
      gl.vertexAttribPointer(alphaAttr, 1, gl.FLOAT, false, 16, 12);

      gl.drawArrays(gl.POINTS, 0, roomGridDots.length / 4);

      gl.disableVertexAttribArray(alphaAttr);
      gl.depthMask(true);
    }

    // ==========================================
    // 2. RENDER 3D PLACEMENT RETICLE & 3D GEOMETRY
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
    gl.uniformMatrix4fv(uModel, false, IDENTITY_MATRIX);

    const posAttr = gl.getAttribLocation(this.geometryProgram, "aPosition");
    gl.enableVertexAttribArray(posAttr);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(posAttr, 3, gl.FLOAT, false, 0, 0);

    // 2a. Clean, Minimalist Placement Pointer Ring (when surface plane is detected)
    if (this.reticleMatrix) {
      gl.uniformMatrix4fv(uModel, false, this.reticleMatrix);

      // Color scheme: Green when dragging, Gold when over handle, Clean Cyan for placement
      if (this.draggedPointIndex !== null) {
        gl.uniform4f(uColor, 0.13, 0.77, 0.36, 0.95);
      } else if (this.hoveredHandleIndex !== null) {
        gl.uniform4f(uColor, 0.98, 0.75, 0.18, 0.95);
      } else {
        gl.uniform4f(uColor, 0.22, 0.74, 0.97, 0.95);
      }

      // Pre-computed circular reticle ring Float32Array (6cm radius)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        this.staticCachedTorusVerts,
        gl.DYNAMIC_DRAW,
      );
      gl.drawArrays(gl.TRIANGLES, 0, this.staticCachedTorusVerts.length / 3);

      // Pre-computed center targeting dot Float32Array (6mm radius)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        this.staticCachedDotVerts,
        gl.DYNAMIC_DRAW,
      );
      gl.drawArrays(gl.TRIANGLES, 0, this.staticCachedDotVerts.length / 3);

      gl.uniformMatrix4fv(uModel, false, IDENTITY_MATRIX);
    }

    let hasMeasurementMidpoint = false;
    let currentDistanceValue: number = 0;

    // 2b. Live Guidance Line (Point 1 -> Reticle)
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
        gl.bufferData(gl.ARRAY_BUFFER, tubeVerts, gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.TRIANGLES, 0, tubeVerts.length / 3);
      }

      currentDistanceValue = distance3D(this.points[0], this.reticlePosition);
      // While taking a measurement, anchor distance badge right at the cursor/reticle in view
      this.measurementMidpoint.x = this.reticlePosition.x;
      this.measurementMidpoint.y = this.reticlePosition.y + 0.07; // 7cm above targeting cursor
      this.measurementMidpoint.z = this.reticlePosition.z;
      hasMeasurementMidpoint = true;
    }

    // 2c. Locked / Active Measurement Line (Point 1 -> Point 2)
    if (this.points.length >= 2 && this.points[0] && this.points[1]) {
      gl.uniform4f(uColor, 0.23, 0.51, 0.96, 1.0); // Bold Blue Tube

      const tubeVerts = this.createCylinderMesh(
        this.points[0],
        this.points[1],
        0.009,
      );
      if (tubeVerts.length > 0) {
        gl.bufferData(gl.ARRAY_BUFFER, tubeVerts, gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.TRIANGLES, 0, tubeVerts.length / 3);
      }

      currentDistanceValue = distance3D(this.points[0], this.points[1]);
      // After completion, anchor distance badge at the midpoint of the line
      this.measurementMidpoint.x = (this.points[0].x + this.points[1].x) / 2;
      this.measurementMidpoint.y =
        (this.points[0].y + this.points[1].y) / 2 + 0.05;
      this.measurementMidpoint.z = (this.points[0].z + this.points[1].z) / 2;
      hasMeasurementMidpoint = true;
    }

    // 2d. Render 3D Handles / Anchor Spheres
    if (this.points.length > 0) {
      gl.bufferData(
        gl.ARRAY_BUFFER,
        this.staticUnitSphereVerts,
        gl.DYNAMIC_DRAW,
      );

      for (let i = 0; i < this.points.length; i++) {
        const p = this.points[i];
        if (!p) continue;

        const isDragged = this.draggedPointIndex === i;
        const isHovered = this.hoveredHandleIndex === i;

        let radius = 0.016;
        if (isDragged) {
          gl.uniform4f(uColor, 0.13, 0.77, 0.36, 1.0); // Bright Green when dragging
          radius = 0.024;
        } else if (isHovered) {
          gl.uniform4f(uColor, 0.98, 0.75, 0.18, 1.0); // Large Golden Pulsing Handle
          radius = 0.022;
        } else {
          gl.uniform4f(uColor, 0.98, 0.75, 0.18, 0.9); // Normal Gold Anchor Sphere
          radius = 0.016;
        }

        const mat = this.handleModelMatrix;
        mat[0] = radius;
        mat[5] = radius;
        mat[10] = radius;
        mat[12] = p.x;
        mat[13] = p.y;
        mat[14] = p.z;

        gl.uniformMatrix4fv(uModel, false, mat);
        gl.drawArrays(gl.TRIANGLES, 0, this.staticUnitSphereVerts.length / 3);
      }

      gl.uniformMatrix4fv(uModel, false, IDENTITY_MATRIX);
    }

    // ==========================================
    // 3. RENDER 3D IN-AR SPATIAL BILLBOARD LABEL
    // ==========================================
    if (hasMeasurementMidpoint && currentDistanceValue > 0.001) {
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
        this.measurementMidpoint.x,
        this.measurementMidpoint.y,
        this.measurementMidpoint.z,
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
  ): Float32Array {
    const dirX = p2.x - p1.x;
    const dirY = p2.y - p1.y;
    const dirZ = p2.z - p1.z;
    const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
    if (len < 0.001) return this.cylinderBuffer.subarray(0, 0);

    const ndx = dirX / len;
    const ndy = dirY / len;
    const ndz = dirZ / len;

    let upx = 0;
    let upy = 1;
    let upz = 0;
    if (Math.abs(ndy) > 0.9) {
      upx = 1;
      upy = 0;
      upz = 0;
    }

    const rx = upy * ndz - upz * ndy;
    const ry = upz * ndx - upx * ndz;
    const rz = upx * ndy - upy * ndx;
    const rLen = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
    const nrx = rx / rLen;
    const nry = ry / rLen;
    const nrz = rz / rLen;

    const nux = ndy * nrz - ndz * nry;
    const nuy = ndz * nrx - ndx * nrz;
    const nuz = ndx * nry - ndy * nrx;

    const segments = 8;
    const r1x = this.ring1X;
    const r1y = this.ring1Y;
    const r1z = this.ring1Z;
    const r2x = this.ring2X;
    const r2y = this.ring2Y;
    const r2z = this.ring2Z;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const cos = Math.cos(angle) * radius;
      const sin = Math.sin(angle) * radius;
      const ox = nrx * cos + nux * sin;
      const oy = nry * cos + nuy * sin;
      const oz = nrz * cos + nuz * sin;
      r1x[i] = p1.x + ox;
      r1y[i] = p1.y + oy;
      r1z[i] = p1.z + oz;
      r2x[i] = p2.x + ox;
      r2y[i] = p2.y + oy;
      r2z[i] = p2.z + oz;
    }

    let offset = 0;
    const buf = this.cylinderBuffer;

    for (let i = 0; i < segments; i++) {
      const a1x = r1x[i]!,
        a1y = r1y[i]!,
        a1z = r1z[i]!;
      const a2x = r1x[i + 1]!,
        a2y = r1y[i + 1]!,
        a2z = r1z[i + 1]!;
      const b1x = r2x[i]!,
        b1y = r2y[i]!,
        b1z = r2z[i]!;
      const b2x = r2x[i + 1]!,
        b2y = r2y[i + 1]!,
        b2z = r2z[i + 1]!;

      // Triangle 1: a1, b1, a2
      buf[offset++] = a1x;
      buf[offset++] = a1y;
      buf[offset++] = a1z;
      buf[offset++] = b1x;
      buf[offset++] = b1y;
      buf[offset++] = b1z;
      buf[offset++] = a2x;
      buf[offset++] = a2y;
      buf[offset++] = a2z;

      // Triangle 2: a2, b1, b2
      buf[offset++] = a2x;
      buf[offset++] = a2y;
      buf[offset++] = a2z;
      buf[offset++] = b1x;
      buf[offset++] = b1y;
      buf[offset++] = b1z;
      buf[offset++] = b2x;
      buf[offset++] = b2y;
      buf[offset++] = b2z;
    }

    return buf;
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
    radialSegments: number = 28,
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
