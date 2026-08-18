/**
 * WebXR Hit-Test Manager
 * Encapsulates WebXR Immersive AR session lifecycle, hit test sourcing, and pose retrieval.
 */

import { Point3D } from "@plainoss/core";

export interface WebXRCapabilities {
  isSupported: boolean;
  errorMessage?: string;
}

export class WebXRManager {
  private session: any = null;
  private refSpace: any = null;
  private hitTestSource: any = null;
  private isRunning: boolean = false;

  /**
   * Checks whether WebXR Immersive AR is supported in the current browser.
   */
  public static async checkSupport(): Promise<WebXRCapabilities> {
    if (typeof window === "undefined" || !("xr" in navigator)) {
      return {
        isSupported: false,
        errorMessage: "WebXR is not available in this browser environment.",
      };
    }

    try {
      const xr = (navigator as any).xr;
      const supported = await xr.isSessionSupported("immersive-ar");
      return {
        isSupported: supported,
        errorMessage: supported
          ? undefined
          : "Immersive AR session is not supported on this device/browser.",
      };
    } catch (e: any) {
      return {
        isSupported: false,
        errorMessage: e.message || "Error checking WebXR support.",
      };
    }
  }

  /**
   * Starts an Immersive AR Session with Hit-Testing
   */
  public async startARSession(
    onHitPose: (point: Point3D | null) => void,
    onSessionEnd: () => void,
    overlayElement?: HTMLElement,
  ): Promise<void> {
    const xr = (navigator as any).xr;
    if (!xr) {
      throw new Error("WebXR not available");
    }

    const sessionInit: any = {
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["local-floor", "viewer"],
    };

    if (overlayElement) {
      sessionInit.optionalFeatures.push("dom-overlay");
      sessionInit.domOverlay = { root: overlayElement };
    }

    this.session = await xr.requestSession("immersive-ar", sessionInit);
    this.refSpace = await this.session.requestReferenceSpace("local");
    const viewerSpace = await this.session.requestReferenceSpace("viewer");

    this.hitTestSource = await this.session.requestHitTestSource({
      space: viewerSpace,
    });

    this.isRunning = true;

    this.session.addEventListener("end", () => {
      this.isRunning = false;
      this.session = null;
      this.hitTestSource = null;
      onSessionEnd();
    });

    const onXRFrame = (_time: number, frame: any) => {
      if (!this.session || !this.isRunning) return;

      const hitTestResults = frame.getHitTestResults(this.hitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(this.refSpace);
        if (pose) {
          const pos = pose.transform.position;
          onHitPose({
            x: pos.x,
            y: pos.y,
            z: pos.z,
          });
        }
      } else {
        onHitPose(null);
      }

      this.session.requestAnimationFrame(onXRFrame);
    };

    this.session.requestAnimationFrame(onXRFrame);
  }

  /**
   * Ends active AR session
   */
  public async endSession(): Promise<void> {
    if (this.session) {
      await this.session.end();
      this.session = null;
      this.isRunning = false;
    }
  }

  public get active(): boolean {
    return this.isRunning;
  }
}
