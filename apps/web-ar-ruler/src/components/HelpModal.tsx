import React, { useEffect } from "react";
import { X, Gamepad2, Smartphone, Keyboard } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="help-title">AR Ruler Instructions & Shortcuts</h2>
          <button
            className="btn-icon"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <section className="help-section">
            <h3>
              <Gamepad2 size={18} className="help-header-icon" />
              <span>3D Sandbox Controls</span>
            </h3>
            <ul>
              <li>
                <strong>Left-Click + Drag:</strong> Orbit / Rotate 3D Camera
                view
              </li>
              <li>
                <strong>Right-Click + Drag / Shift + Drag:</strong> Pan camera
                target
              </li>
              <li>
                <strong>Scroll Wheel / Pinch:</strong> Zoom in and out
              </li>
              <li>
                <strong>Click on Grid:</strong> Place measurement point
              </li>
              <li>
                <strong>Spacebar:</strong> Place point at crosshairs
              </li>
            </ul>
          </section>

          <section className="help-section">
            <h3>
              <Smartphone size={18} className="help-header-icon" />
              <span>WebXR Augmented Reality (Mobile Chrome)</span>
            </h3>
            <ul>
              <li>
                Tap <strong>"Start AR"</strong> on compatible Android Chrome
                devices with WebXR Hit-Test.
              </li>
              <li>
                Point camera at flat surface (floor, table, wall) to see the
                spatial reticle.
              </li>
              <li>
                Tap anywhere on the screen to anchor 3D measurement points in
                the real world.
              </li>
            </ul>
          </section>

          <section className="help-section">
            <h3>
              <Keyboard size={18} className="help-header-icon" />
              <span>Keyboard Shortcuts</span>
            </h3>
            <div className="shortcuts-grid">
              <span className="kbd">1</span> <span>Distance Mode</span>
              <span className="kbd">2</span> <span>Continuous Path Mode</span>
              <span className="kbd">3</span> <span>Polygon Area Mode</span>
              <span className="kbd">4</span> <span>Angle Mode</span>
              <span className="kbd">Z</span> <span>Undo Last Point</span>
              <span className="kbd">Esc</span> <span>Clear All Points</span>
              <span className="kbd">S</span> <span>Toggle Snap to Grid</span>
            </div>
          </section>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
