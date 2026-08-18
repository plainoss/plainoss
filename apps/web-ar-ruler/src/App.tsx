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
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [draggedHandleIndex, setDraggedHandleIndex] = useState<number | null>(
    null,
  );
  const [hoveredHandleIndex, setHoveredHandleIndex] = useState<number | null>(
    null,
  );
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

  // Suppress XR tap when interacting with DOM UI controls
  const handleUIControlInteraction = useCallback((e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (xrEngineRef.current) {
      xrEngineRef.current.suppressTap(450);
    }
  }, []);

  // Block beforexrselect on DOM overlay controls
  useEffect(() => {
    const handleBeforeXRSelect = (e: any) => {
      const target = e.target as HTMLElement;
      if (
        target?.closest?.(
          ".ar-bottom-controls, .ar-top-banner, .toast-container, button",
        )
      ) {
        e.preventDefault();
        xrEngineRef.current?.suppressTap(450);
      }
    };
    document.addEventListener("beforexrselect", handleBeforeXRSelect);
    return () =>
      document.removeEventListener("beforexrselect", handleBeforeXRSelect);
  }, []);

  const initEngine = useCallback(
    (canvas: HTMLCanvasElement) => {
      if (xrEngineRef.current) return xrEngineRef.current;
      const engine = new WebXREngine(canvas, {
        onPointPlaced: (_p, currentPts) => {
          setPoints(currentPts);
          if (currentPts.length === 1) {
            showToast("Point 1 placed. Aim at Point 2 & tap", "info");
          } else if (
            currentPts.length === 2 &&
            currentPts[0] &&
            currentPts[1]
          ) {
            const d = distance3D(currentPts[0], currentPts[1]);
            showToast(`Distance: ${formatDistance(d, unit, 2)}`, "success");
          }
        },
        onScanningStateChange: (scanning) => {
          setIsScanning(scanning);
        },
        onHandleHoverChange: (hoverIdx) => {
          setHoveredHandleIndex(hoverIdx);
        },
        onHandleGrabbed: (grabIdx, currentPts) => {
          setDraggedHandleIndex(grabIdx);
          setPoints([...currentPts]);
          showToast(`Moving Point ${grabIdx + 1}. Aim & tap to lock`, "info");
        },
        onHandleMoved: (_idx, currentPts) => {
          setPoints([...currentPts]);
        },
        onHandleDropped: (_dropIdx, currentPts) => {
          setDraggedHandleIndex(null);
          setPoints([...currentPts]);
          if (currentPts.length >= 2 && currentPts[0] && currentPts[1]) {
            const d = distance3D(currentPts[0], currentPts[1]);
            showToast(
              `Updated Distance: ${formatDistance(d, unit, 2)}`,
              "success",
            );
          }
        },
        onSessionStarted: () => {
          setIsARActive(true);
          setIsScanning(true);
          setDraggedHandleIndex(null);
          setHoveredHandleIndex(null);
          setPoints([]);
        },
        onSessionEnded: () => {
          setIsARActive(false);
          setIsScanning(true);
          setDraggedHandleIndex(null);
          setHoveredHandleIndex(null);
        },
      });
      engine.unit = unit;
      xrEngineRef.current = engine;
      return engine;
    },
    [unit, showToast],
  );

  // Start AR Session
  const handleStartAR = useCallback(async () => {
    try {
      if (!xrCanvasRef.current) return;
      const engine = initEngine(xrCanvasRef.current);
      const rootOverlay = document.getElementById("root") || document.body;
      await engine.startAR(rootOverlay as HTMLElement);
    } catch (err: any) {
      if (err.name !== "SecurityError") {
        console.warn("AR start error:", err);
      }
    }
  }, [initEngine]);

  // Initialize WebXR Engine & check support + attempt auto-start
  useEffect(() => {
    WebXREngine.isSupported().then((supported) => {
      setIsARSupported(supported);
      if (supported && xrCanvasRef.current) {
        initEngine(xrCanvasRef.current);
        handleStartAR();
      }
    });
  }, [initEngine, handleStartAR]);

  // Sync unit changes to engine
  useEffect(() => {
    if (xrEngineRef.current) {
      xrEngineRef.current.unit = unit;
    }
  }, [unit]);

  // Clear / Reset points without placing a new point
  const handleReset = useCallback(
    (e?: React.SyntheticEvent) => {
      handleUIControlInteraction(e);
      if (xrEngineRef.current) {
        xrEngineRef.current.points = [];
        xrEngineRef.current.draggedPointIndex = null;
        xrEngineRef.current.hoveredHandleIndex = null;
        xrEngineRef.current.suppressTap(450);
      }
      setPoints([]);
      setDraggedHandleIndex(null);
      setHoveredHandleIndex(null);
      showToast("Measurement cleared", "info");
    },
    [handleUIControlInteraction, showToast],
  );

  // Fallback 3D Sandbox when WebXR is not available
  useEffect(() => {
    if (isARSupported === false && fallbackCanvasRef.current) {
      const renderer = new Renderer3D(fallbackCanvasRef.current);
      renderer.theme = DARK_THEME;
      fallbackRendererRef.current = renderer;
      renderer.resize();
      renderer.render(points, null, "distance", unit, "deg");
    }
  }, [isARSupported, points, unit]);

  // Dynamic Instruction Text
  let statusMessage = "🎯 Surface detected! Tap to set Point 1";
  let isScanningClass = isScanning ? "scanning" : "";

  if (isScanning) {
    statusMessage = "📱 Move phone slowly to detect surface...";
  } else if (draggedHandleIndex !== null) {
    statusMessage = `📍 Moving Point ${draggedHandleIndex + 1} — Aim & tap to lock`;
  } else if (hoveredHandleIndex !== null && points.length > 0) {
    statusMessage = `👆 Tap to grab Point ${hoveredHandleIndex + 1} & edit line`;
  } else if (points.length === 0) {
    statusMessage = "🎯 Surface detected! Tap to set Point 1";
  } else if (points.length === 1) {
    statusMessage = "📏 Move to endpoint & tap for Point 2";
  } else if (points.length >= 2) {
    statusMessage = "✅ Measurement locked (Aim at handle to edit)";
  }

  return (
    <div className="ar-app-root">
      {/* 1. Main WebXR Fullscreen Canvas */}
      <canvas
        ref={xrCanvasRef}
        className="canvas-webxr-fullscreen"
        style={{ display: isARSupported !== false ? "block" : "none" }}
      />

      {/* 2. Fullscreen 1-Tap Trigger (Tap anywhere to start AR) */}
      {isARSupported && !isARActive && (
        <div
          className="fullscreen-tap-launcher"
          onClick={handleStartAR}
          role="button"
          tabIndex={0}
        >
          <div className="tap-launcher-content">
            <div className="pulsing-ar-badge">📷</div>
            <h2>AR Ruler</h2>
            <p>Tap anywhere on screen to begin</p>
          </div>
        </div>
      )}

      {/* 3. WebXR Unsupported Screen */}
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

      {/* 4. Minimal In-AR Control Overlay */}
      {isARSupported && isARActive && (
        <div className="ar-minimal-overlay">
          {/* Top Instruction Banner (safe area padding to avoid camera hole) */}
          <div className="ar-top-banner">
            <div className={`ar-status-pill ${isScanningClass}`}>
              {isScanning && (
                <span className="pulsing-scan-dot" aria-hidden="true" />
              )}
              <span>{statusMessage}</span>
            </div>
          </div>

          {/* Bottom Minimal Controls */}
          <div
            className="ar-bottom-controls"
            onPointerDown={handleUIControlInteraction}
            onTouchStart={handleUIControlInteraction}
          >
            <button
              className="btn-ar-action"
              onClick={handleReset}
              onPointerDown={handleUIControlInteraction}
              title="Clear Measurement"
            >
              🔄 Clear
            </button>

            <div className="ar-unit-pill-group">
              {(["m", "cm", "in", "ft"] as DistanceUnit[]).map((u) => (
                <button
                  key={u}
                  className={`btn-unit-pill ${unit === u ? "active" : ""}`}
                  onClick={(e) => {
                    handleUIControlInteraction(e);
                    setUnit(u);
                  }}
                  onPointerDown={handleUIControlInteraction}
                >
                  {u}
                </button>
              ))}
            </div>

            <button
              className="btn-ar-action btn-ar-exit"
              onClick={(e) => {
                handleUIControlInteraction(e);
                xrEngineRef.current?.endAR();
              }}
              onPointerDown={handleUIControlInteraction}
              title="Exit AR Mode"
            >
              ⏹ Exit
            </button>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
