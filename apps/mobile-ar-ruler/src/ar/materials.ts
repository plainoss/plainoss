import { NativeModules } from "react-native";
import { ViroMaterials } from "@reactvision/react-viro";

let materialsInitialized = false;

export function initViroMaterials(): void {
  if (materialsInitialized) return;
  if (!NativeModules.VRTMaterialManager) return;

  try {
    ViroMaterials.createMaterials({
      laserLine: {
        diffuseColor: "#38bdf8",
        lightingModel: "Constant",
      },
      activeGuideLine: {
        diffuseColor: "rgba(56, 189, 248, 0.8)",
        lightingModel: "Constant",
      },
      normalAnchor: {
        diffuseColor: "#fbbf24",
        lightingModel: "Constant",
      },
      hoveredAnchor: {
        diffuseColor: "#f59e0b",
        lightingModel: "Constant",
      },
      draggedAnchor: {
        diffuseColor: "#22c55e",
        lightingModel: "Constant",
      },
      surfacePlane: {
        diffuseColor: "rgba(56, 189, 248, 0.15)",
        lightingModel: "Constant",
      },
      reticleRingNormal: {
        diffuseColor: "rgba(56, 189, 248, 0.85)",
        lightingModel: "Constant",
      },
      reticleRingHover: {
        diffuseColor: "rgba(245, 158, 11, 0.9)",
        lightingModel: "Constant",
      },
      reticleRingDragged: {
        diffuseColor: "rgba(34, 197, 94, 0.9)",
        lightingModel: "Constant",
      },
      reticleCenterDot: {
        diffuseColor: "#ffffff",
        lightingModel: "Constant",
      },
    });
    materialsInitialized = true;
  } catch {
    // Ignore if not in native viro context
  }
}
