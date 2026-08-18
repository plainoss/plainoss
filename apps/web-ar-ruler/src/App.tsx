import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Point3D,
  MeasurementMode,
  DistanceUnit,
  AngleUnit,
  MeasurementRecord,
  distance3D,
  pathLength3D,
  polygonArea3D,
  angleBetween3D,
  formatDistance,
  formatArea,
  formatAngle,
} from "@plainoss/core";
import {
  Renderer3D,
  DARK_THEME,
  LIGHT_THEME,
  AR_THEME,
} from "./canvas/renderer3d";
import { WebXREngine } from "./xr/webxr-engine";
import { useTheme } from "./hooks/useTheme";
import { Header } from "./components/Header";
import { Toolbar } from "./components/Toolbar";
import { MetricsPanel } from "./components/MetricsPanel";
import { HistoryDrawer } from "./components/HistoryDrawer";
import { HelpModal } from "./components/HelpModal";
import { ToastContainer, ToastMessage } from "./components/Toast";
import "./index.css";

export function App() {
  const [theme, toggleTheme] = useTheme();
  const [mode, setMode] = useState<MeasurementMode>("distance");
  const [unit, setUnit] = useState<DistanceUnit>("m");
  const [angleUnit] = useState<AngleUnit>("deg");
  const [points, setPoints] = useState<Point3D[]>([]);
  const [hoverPoint, setHoverPoint] = useState<Point3D | null>(null);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);

  // WebXR State (Strictly WebXR immersive-ar, zero fallbacks)
  const [isARSupported, setIsARSupported] = useState<boolean>(false);
  const [isARActive, setIsARActive] = useState<boolean>(false);
  const xrEngineRef = useRef<WebXREngine | null>(null);
  const xrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dialogs & Drawers
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // History records
  const [history, setHistory] = useState<MeasurementRecord[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("plainoss_ar_ruler_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Canvas & 3D Renderer references (Sandbox / 3D Mode)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Renderer3D | null>(null);

  // Mouse & Touch gesture tracking
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; isPan: boolean }>({
    x: 0,
    y: 0,
    isPan: false,
  });
  const dragDistanceRef = useRef<number>(0);
  const initialPinchDistRef = useRef<number | null>(null);
  const initialCamDistRef = useRef<number>(4.5);

  // Toast helper
  const showToast = useCallback(
    (text: string, type: "info" | "success" | "warning" = "info") => {
      const id = Date.now().toString() + Math.random().toString(36).slice(2, 5);
      setToasts((prev) => [...prev, { id, text, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem("plainoss_ar_ruler_history", JSON.stringify(history));
  }, [history]);

  // Check WebXR Hardware & Browser Support
  useEffect(() => {
    WebXREngine.isSupported().then((supported) => {
      setIsARSupported(supported);
    });
  }, []);

  // Initialize Canvas Renderer for 3D Sandbox
  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new Renderer3D(canvasRef.current);
    rendererRef.current = renderer;

    const handleResize = () => {
      renderer.resize();
      renderer.render(points, hoverPoint, mode, unit, angleUnit);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Update renderer theme & render
  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.isARMode = isARActive;
    rendererRef.current.theme = isARActive
      ? AR_THEME
      : theme === "dark"
        ? DARK_THEME
        : LIGHT_THEME;
    rendererRef.current.render(points, hoverPoint, mode, unit, angleUnit);

    if (xrEngineRef.current) {
      xrEngineRef.current.points = points;
    }
  }, [theme, isARActive, points, hoverPoint, mode, unit, angleUnit]);

  // Point snap calculation (only for 3D sandbox grid)
  const applySnap = (p: Point3D): Point3D => {
    if (!snapToGrid || isARActive) return p;
    const snapStep = 0.5;
    return {
      x: Math.round(p.x / snapStep) * snapStep,
      y: p.y,
      z: Math.round(p.z / snapStep) * snapStep,
    };
  };

  // Add Point handler
  const handleAddPoint = useCallback(
    (rawPoint: Point3D) => {
      const p = applySnap(rawPoint);
      setPoints((prev) => {
        if (mode === "distance" && prev.length >= 2) {
          return [p];
        }
        if (mode === "angle" && prev.length >= 3) {
          return [p];
        }
        return [...prev, p];
      });
    },
    [mode, snapToGrid, isARActive],
  );

  // Undo point
  const handleUndo = useCallback(() => {
    setPoints((prev) => prev.slice(0, -1));
  }, []);

  // Clear points
  const handleClear = useCallback(() => {
    setPoints([]);
    showToast("Measurement cleared", "info");
  }, [showToast]);

  // Copy to clipboard
  const handleCopy = useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        showToast(`Copied ${label}: ${text}`, "success");
      } catch {
        showToast("Failed to copy to clipboard", "warning");
      }
    },
    [showToast],
  );

  // Save measurement to history
  const handleSaveMeasurement = useCallback(() => {
    if (points.length < 2) return;

    let value = 0;
    let formatted = "";

    const p0 = points[0];
    const p1 = points[1];
    const p2 = points[2];

    if (mode === "distance" && p0 && p1) {
      value = distance3D(p0, p1);
      formatted = formatDistance(value, unit, 2);
    } else if (mode === "path") {
      value = pathLength3D(points);
      formatted = formatDistance(value, unit, 2);
    } else if (mode === "polygon") {
      value = polygonArea3D(points);
      formatted = formatArea(value, unit, 2);
    } else if (mode === "angle" && p0 && p1 && p2) {
      value = angleBetween3D(p0, p1, p2, angleUnit);
      formatted = formatAngle(value, angleUnit, 1);
    }

    const record: MeasurementRecord = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: Date.now(),
      mode,
      value,
      unit: mode === "angle" ? angleUnit : unit,
      formatted,
      points: [...points],
    };

    setHistory((prev) => [record, ...prev]);
    showToast(`Saved ${formatted} to history`, "success");
  }, [points, mode, unit, angleUnit, showToast]);

  // Load Presets
  const handleLoadPreset = (preset: string) => {
    if (preset === "room") {
      setMode("polygon");
      setPoints([
        { x: -2, y: 0, z: -1.5 },
        { x: 2, y: 0, z: -1.5 },
        { x: 2, y: 0, z: 1.5 },
        { x: -2, y: 0, z: 1.5 },
      ]);
      showToast("Loaded Sample Room preset (4m × 3m)", "info");
    } else if (preset === "desk") {
      setMode("polygon");
      setPoints([
        { x: -0.8, y: 0, z: -0.4 },
        { x: 0.8, y: 0, z: -0.4 },
        { x: 0.8, y: 0, z: 0.4 },
        { x: -0.8, y: 0, z: 0.4 },
      ]);
      showToast("Loaded Desk Dimensions preset (1.6m × 0.8m)", "info");
    } else if (preset === "triangle") {
      setMode("polygon");
      setPoints([
        { x: 0, y: 0, z: 0 },
        { x: 4, y: 0, z: 0 },
        { x: 0, y: 0, z: 3 },
      ]);
      showToast("Loaded Right Triangle preset (3-4-5m)", "info");
    } else if (preset === "sloped") {
      setMode("angle");
      setPoints([
        { x: 0, y: 0, z: 0 },
        { x: 3, y: 0, z: 0 },
        { x: 3, y: 1.732, z: 0 },
      ]);
      showToast("Loaded Roof Slope Angle preset", "info");
    }
  };

  // Start / Stop True WebXR Session (No Fallback)
  const handleToggleAR = async () => {
    if (!isARSupported) {
      showToast("WebXR AR is not supported on this browser/device.", "warning");
      return;
    }

    if (isARActive) {
      if (xrEngineRef.current) {
        await xrEngineRef.current.endAR();
      }
      setIsARActive(false);
      showToast("Exited WebXR AR mode", "info");
    } else {
      try {
        if (!xrCanvasRef.current) {
          throw new Error("WebXR canvas element not found");
        }

        const engine = new WebXREngine(xrCanvasRef.current, {
          onHitPoseChange: (pose) => {
            setHoverPoint(pose);
          },
          onPointPlaced: (p) => {
            handleAddPoint(p);
            showToast("Placed AR anchor point on surface", "info");
          },
          onSessionStarted: () => {
            setIsARActive(true);
            showToast(
              "WebXR AR session active! Tap physical surfaces to place points.",
              "success",
            );
          },
          onSessionEnded: () => {
            setIsARActive(false);
            showToast("WebXR session ended", "info");
          },
        });

        xrEngineRef.current = engine;
        await engine.startAR();
      } catch (err: any) {
        console.error("WebXR start error:", err);
        showToast(err.message || "Could not start WebXR AR session", "warning");
      }
    }
  };

  // Mouse Handlers (3D Sandbox)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isARActive) return;
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      isPan: e.button === 2 || e.shiftKey,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isARActive) return;
    const renderer = rendererRef.current;
    if (!renderer || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      dragDistanceRef.current += Math.hypot(dx, dy);

      if (dragStartRef.current.isPan) {
        const panSpeed = 0.005 * renderer.camera.distance;
        const cosY = Math.cos(renderer.camera.yaw);
        const sinY = Math.sin(renderer.camera.yaw);
        renderer.camera.target.x -= dx * cosY * panSpeed;
        renderer.camera.target.z += dx * sinY * panSpeed;
        renderer.camera.target.y += dy * panSpeed;
      } else {
        renderer.camera.yaw += dx * 0.008;
        renderer.camera.pitch = Math.max(
          -Math.PI / 2.2,
          Math.min(Math.PI / 2.2, renderer.camera.pitch + dy * 0.008),
        );
      }

      dragStartRef.current.x = e.clientX;
      dragStartRef.current.y = e.clientY;
      renderer.render(points, hoverPoint, mode, unit, angleUnit);
    } else {
      const ground = renderer.unprojectGround(mouseX, mouseY);
      if (ground) {
        setHoverPoint(applySnap(ground));
      } else {
        setHoverPoint(null);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isARActive) return;
    const renderer = rendererRef.current;
    if (
      isDraggingRef.current &&
      dragDistanceRef.current < 6 &&
      renderer &&
      canvasRef.current
    ) {
      const rect = canvasRef.current.getBoundingClientRect();
      const ground = renderer.unprojectGround(
        e.clientX - rect.left,
        e.clientY - rect.top,
      );
      if (ground) {
        handleAddPoint(ground);
      }
    }
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (isARActive) return;
    const renderer = rendererRef.current;
    if (!renderer) return;
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.003;
    renderer.camera.distance = Math.max(
      1,
      Math.min(25, renderer.camera.distance + zoomDelta),
    );
    renderer.render(points, hoverPoint, mode, unit, angleUnit);
  };

  // Touch Handlers (3D Sandbox)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isARActive) return;
    const renderer = rendererRef.current;
    if (!renderer) return;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (!touch) return;
      isDraggingRef.current = true;
      dragDistanceRef.current = 0;
      dragStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        isPan: false,
      };

      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const ground = renderer.unprojectGround(
          touch.clientX - rect.left,
          touch.clientY - rect.top,
        );
        if (ground) {
          setHoverPoint(applySnap(ground));
        }
      }
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      if (t1 && t2) {
        initialPinchDistRef.current = Math.hypot(
          t2.clientX - t1.clientX,
          t2.clientY - t1.clientY,
        );
        initialCamDistRef.current = renderer.camera.distance;
        dragStartRef.current = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
          isPan: true,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isARActive) return;
    const renderer = rendererRef.current;
    if (!renderer || !canvasRef.current) return;

    if (e.touches.length === 1 && isDraggingRef.current) {
      const touch = e.touches[0];
      if (!touch) return;
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;
      dragDistanceRef.current += Math.hypot(dx, dy);

      renderer.camera.yaw += dx * 0.009;
      renderer.camera.pitch = Math.max(
        -Math.PI / 2.2,
        Math.min(Math.PI / 2.2, renderer.camera.pitch + dy * 0.009),
      );

      dragStartRef.current.x = touch.clientX;
      dragStartRef.current.y = touch.clientY;

      const rect = canvasRef.current.getBoundingClientRect();
      const ground = renderer.unprojectGround(
        touch.clientX - rect.left,
        touch.clientY - rect.top,
      );
      if (ground) {
        setHoverPoint(applySnap(ground));
      }

      renderer.render(points, hoverPoint, mode, unit, angleUnit);
    } else if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      if (t1 && t2) {
        const currentDist = Math.hypot(
          t2.clientX - t1.clientX,
          t2.clientY - t1.clientY,
        );
        const scale = initialPinchDistRef.current / Math.max(currentDist, 10);
        renderer.camera.distance = Math.max(
          1,
          Math.min(25, initialCamDistRef.current * scale),
        );

        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;
        const dx = midX - dragStartRef.current.x;
        const dy = midY - dragStartRef.current.y;
        const panSpeed = 0.005 * renderer.camera.distance;
        const cosY = Math.cos(renderer.camera.yaw);
        const sinY = Math.sin(renderer.camera.yaw);
        renderer.camera.target.x -= dx * cosY * panSpeed;
        renderer.camera.target.z += dx * sinY * panSpeed;
        renderer.camera.target.y += dy * panSpeed;

        dragStartRef.current.x = midX;
        dragStartRef.current.y = midY;

        renderer.render(points, hoverPoint, mode, unit, angleUnit);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isARActive) return;
    const renderer = rendererRef.current;
    if (
      isDraggingRef.current &&
      dragDistanceRef.current < 10 &&
      renderer &&
      canvasRef.current
    ) {
      const touch = e.changedTouches[0];
      if (touch) {
        const rect = canvasRef.current.getBoundingClientRect();
        const ground = renderer.unprojectGround(
          touch.clientX - rect.left,
          touch.clientY - rect.top,
        );
        if (ground) {
          handleAddPoint(ground);
        }
      }
    }
    isDraggingRef.current = false;
    initialPinchDistRef.current = null;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.key === "1") setMode("distance");
      else if (e.key === "2") setMode("path");
      else if (e.key === "3") setMode("polygon");
      else if (e.key === "4") setMode("angle");
      else if (e.key === "z" || e.key === "Z") handleUndo();
      else if (e.key === "Escape") handleClear();
      else if (e.key === "s" || e.key === "S") setSnapToGrid((prev) => !prev);
      else if (e.key === " " && hoverPoint && !isARActive) {
        e.preventDefault();
        handleAddPoint(hoverPoint);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hoverPoint, isARActive, handleAddPoint, handleUndo, handleClear]);

  return (
    <div className={`app-layout ${isARActive ? "ar-active" : ""}`}>
      {/* Top Header */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        isARSupported={isARSupported}
        isARActive={isARActive}
        onToggleAR={handleToggleAR}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={history.length}
      />

      {/* Main Viewport */}
      <main className={`viewport-container ${isARActive ? "ar-active" : ""}`}>
        {/* Dedicated WebGL canvas for WebXR */}
        <canvas
          ref={xrCanvasRef}
          className="canvas-webxr"
          style={{ display: isARActive ? "block" : "none" }}
        />

        {/* 2D/3D Sandbox Canvas for non-XR */}
        <canvas
          ref={canvasRef}
          className="canvas-3d"
          style={{ display: isARActive ? "none" : "block" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => {
            isDraggingRef.current = false;
            initialPinchDistRef.current = null;
          }}
          onClick={(e) => {
            if (isARActive) return;
            const renderer = rendererRef.current;
            if (!renderer || !canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const ground = renderer.unprojectGround(
              e.clientX - rect.left,
              e.clientY - rect.top,
            );
            if (ground) {
              handleAddPoint(ground);
            }
          }}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* Floating Measurement Overlay Cards */}
        <div className="overlay-metrics-wrapper">
          <MetricsPanel
            points={points}
            hoverPoint={hoverPoint}
            mode={mode}
            unit={unit}
            angleUnit={angleUnit}
            onCopy={handleCopy}
            onSave={handleSaveMeasurement}
          />
        </div>

        {/* Floating Bottom Toolbar */}
        <div className="overlay-toolbar-wrapper">
          <Toolbar
            mode={mode}
            onSelectMode={setMode}
            unit={unit}
            onSelectUnit={setUnit}
            pointCount={points.length}
            onUndo={handleUndo}
            onClear={handleClear}
            snapToGrid={snapToGrid}
            onToggleSnap={() => setSnapToGrid((p) => !p)}
            onLoadPreset={handleLoadPreset}
          />
        </div>

        {/* Interactive Helper Hint */}
        <div className="canvas-hint" aria-hidden="true">
          <span>
            {isARActive
              ? "📷 WebXR AR: Move camera to detect surfaces & tap screen to place points"
              : !isARSupported
                ? "ℹ️ WebXR AR requires an ARCore Android device or WebXR browser. 3D sandbox active."
                : points.length === 0
                  ? '👆 Tap "Start AR" for physical measurement or click grid for 3D sandbox'
                  : "✨ Tap to place next point or drag to orbit"}
          </span>
        </div>
      </main>

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        records={history}
        onDeleteRecord={(id) =>
          setHistory((prev) => prev.filter((r) => r.id !== id))
        }
        onClearAll={() => {
          setHistory([]);
          showToast("History cleared", "info");
        }}
        onCopyRecord={(rec) =>
          handleCopy(rec.formatted, `${rec.mode} measurement`)
        }
        onCopyAll={() => {
          const allText = history
            .map(
              (r) =>
                `[${r.mode.toUpperCase()}] ${r.formatted} (${new Date(r.timestamp).toLocaleString()})`,
            )
            .join("\n");
          handleCopy(allText, "all measurement history");
        }}
      />

      {/* Help & Shortcuts Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
