import { useState, useEffect, useRef, useCallback } from "react";
import {
  Point3D,
  DistanceUnit,
  distance3D,
  formatDistance,
} from "@plainoss/core";
import { WebXREngine } from "./xr/webxr-engine";
import { Renderer3D, DARK_THEME } from "./canvas/renderer3d";
import { ToastContainer, ToastMessage } from "./components/Toast";
import "./index.css";

export function App() {
  const [unit, setUnit] = useState<DistanceUnit>("m");
  const [isARSupported, setIsARSupported] = useState<boolean | null>(null);
  const [isARActive, setIsARActive] = useState<boolean>(false);
  const [points, setPoints] = useState<Point3D[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Canvas References
  const xrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const xrEngineRef = useRef<WebXREngine | null>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fallbackRendererRef = useRef<Renderer3D | null>(null);

  // Toast Helper
  const showToast = useCallback(
    (text: string, type: "info" | "success" | "warning" = "info") => {
      const id = Date.now().toString() + Math.random().toString(36).slice(2, 5);
      setToasts((prev) => [...prev, { id, text, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2500);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Initialize WebXR Engine & Automatically check support
  useEffect(() => {
    WebXREngine.isSupported().then((supported) => {
      setIsARSupported(supported);
      if (supported && xrCanvasRef.current) {
        initEngine(xrCanvasRef.current);
      }
    });
  }, []);

  const initEngine = (canvas: HTMLCanvasElement) => {
    if (xrEngineRef.current) return xrEngineRef.current;
    const engine = new WebXREngine(canvas, {
      onPointPlaced: (_p, currentPts) => {
        setPoints(currentPts);
        if (currentPts.length === 1) {
          showToast("Point 1 placed. Aim at Point 2 & tap", "info");
        } else if (currentPts.length === 2 && currentPts[0] && currentPts[1]) {
          const d = distance3D(currentPts[0], currentPts[1]);
          showToast(`Distance: ${formatDistance(d, unit, 2)}`, "success");
        }
      },
      onSessionStarted: () => {
        setIsARActive(true);
        setPoints([]);
      },
      onSessionEnded: () => {
        setIsARActive(false);
      },
    });
    engine.unit = unit;
    xrEngineRef.current = engine;
    return engine;
  };

  // Sync unit changes to engine
  useEffect(() => {
    if (xrEngineRef.current) {
      xrEngineRef.current.unit = unit;
    }
  }, [unit]);

  // Start AR Session
  const handleStartAR = async () => {
    try {
      if (!xrCanvasRef.current) return;
      const engine = initEngine(xrCanvasRef.current);
      const rootOverlay = document.getElementById("root") || document.body;
      await engine.startAR(rootOverlay as HTMLElement);
    } catch (err: any) {
      console.error("AR start failed:", err);
      showToast(err.message || "Could not start AR session", "warning");
    }
  };

  // Clear / Reset points
  const handleReset = () => {
    if (xrEngineRef.current) {
      xrEngineRef.current.points = [];
    }
    setPoints([]);
    showToast("Measurement cleared", "info");
  };

  // Fallback 3D Sandbox when WebXR is not available on current device
  useEffect(() => {
    if (isARSupported === false && fallbackCanvasRef.current) {
      const renderer = new Renderer3D(fallbackCanvasRef.current);
      renderer.theme = DARK_THEME;
      fallbackRendererRef.current = renderer;
      renderer.resize();
      renderer.render(points, null, "distance", unit, "deg");
    }
  }, [isARSupported, points, unit]);

  return (
    <div className="ar-app-root">
      {/* 1. Main WebXR Fullscreen Canvas */}
      <canvas
        ref={xrCanvasRef}
        className="canvas-webxr-fullscreen"
        style={{ display: isARSupported !== false ? "block" : "none" }}
      />

      {/* 2. WebXR Unsupported Screen */}
      {isARSupported === false && (
        <div className="unsupported-screen">
          <div className="unsupported-card">
            <div className="unsupported-icon">📐</div>
            <h2>WebXR AR Required</h2>
            <p>
              AR Ruler requires <strong>WebXR Immersive-AR</strong> with surface
              hit-testing.
            </p>
            <p className="unsupported-hint">
              Open this URL on an{" "}
              <strong>ARCore-compatible Android device</strong> (in Chrome),
              Meta Quest Browser, or WebXR headset.
            </p>
            <canvas ref={fallbackCanvasRef} className="fallback-canvas" />
          </div>
        </div>
      )}

      {/* 3. Minimal In-AR Control Overlay */}
      {isARSupported !== false && (
        <div className="ar-minimal-overlay">
          {/* Top Instruction Banner */}
          <div className="ar-top-banner">
            {!isARActive ? (
              <button className="btn-start-ar-hero" onClick={handleStartAR}>
                <span className="btn-icon">📷</span>
                <span>Start AR Ruler</span>
              </button>
            ) : (
              <div className="ar-status-pill">
                {points.length === 0
                  ? "🎯 Aim at surface & tap to set Point 1"
                  : points.length === 1
                    ? "📏 Aim at endpoint & tap for Point 2"
                    : "✅ Measurement locked (Tap to reset)"}
              </div>
            )}
          </div>

          {/* Bottom Minimal Controls */}
          {isARActive && (
            <div className="ar-bottom-controls">
              <button
                className="btn-ar-action"
                onClick={handleReset}
                title="Clear Measurement"
              >
                🔄 Clear
              </button>

              <div className="ar-unit-pill-group">
                {(["m", "cm", "in", "ft"] as DistanceUnit[]).map((u) => (
                  <button
                    key={u}
                    className={`btn-unit-pill ${unit === u ? "active" : ""}`}
                    onClick={() => setUnit(u)}
                  >
                    {u}
                  </button>
                ))}
              </div>

              <button
                className="btn-ar-action btn-ar-exit"
                onClick={() => xrEngineRef.current?.endAR()}
                title="Exit AR Mode"
              >
                ⏹ Exit
              </button>
            </div>
          )}
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
