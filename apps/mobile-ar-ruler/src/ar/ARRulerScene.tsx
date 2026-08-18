import React, { useState, useCallback, useRef, useMemo } from "react";
import { StyleSheet } from "react-native";
import {
  ViroARScene,
  ViroNode,
  ViroSphere,
  ViroPolyline,
  ViroText,
  ViroTrackingStateConstants,
  ViroCameraARHitTest,
} from "@reactvision/react-viro";
import { Point3D, distance3D, formatDistance } from "@plainoss/core";
import { ARRulerSceneProps } from "./types";

// Generate 24-segment smooth circular ring vertices flat on local XZ plane
function generateCircleRing(
  radius: number,
  segments = 24,
): [number, number, number][] {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    pts.push([
      Number((Math.cos(theta) * radius).toFixed(4)),
      0.002, // 2mm offset above plane to prevent z-fighting
      Number((Math.sin(theta) * radius).toFixed(4)),
    ]);
  }
  return pts;
}

export function ARRulerScene(props: {
  sceneNavigator: { viroAppProps: ARRulerSceneProps };
}) {
  const {
    points,
    unit,
    draggedHandleIndex,
    hoveredHandleIndex,
    onPointPlaced,
    onHandleGrabbed,
    onHandleMoved,
    onHandleDropped,
    onTrackingStateChange,
    onReticlePositionUpdate,
  } = props.sceneNavigator.viroAppProps;

  const [reticle3D, setReticle3D] = useState<Point3D | null>(null);
  const [reticleRotation, setReticleRotation] = useState<
    [number, number, number]
  >([0, 0, 0]);

  const smoothedReticleRef = useRef<Point3D | null>(null);
  const hasExactPlaneRef = useRef<boolean>(false);
  const lastStateUpdateRef = useRef<number>(0);

  // Precomputed geometry for 3D surface reticle
  const outerRingPoints = useMemo(() => generateCircleRing(0.055, 24), []);
  const innerRingPoints = useMemo(() => generateCircleRing(0.025, 16), []);

  // Native Continuous Camera Ray Hit-Testing with Exponential Moving Average (EMA) Smoothing
  const handleCameraARHitTest = useCallback(
    (event: ViroCameraARHitTest) => {
      const results = event.hitTestResults;
      if (results && results.length > 0) {
        const planeHit =
          results.find((r) => r.type === "ExistingPlaneUsingExtent") ||
          results.find((r) => r.type === "ExistingPlane") ||
          results.find((r) => r.type === "EstimatedHorizontalPlane") ||
          results.find((r) => r.type === "FeaturePoint") ||
          results[0];

        if (planeHit && planeHit.transform?.position) {
          const [rawX, rawY, rawZ] = planeHit.transform.position;
          hasExactPlaneRef.current = true;

          // Align reticle rotation with detected plane orientation
          if (planeHit.transform.rotation) {
            setReticleRotation(planeHit.transform.rotation);
          } else {
            setReticleRotation([0, 0, 0]);
          }

          // EMA Lerp filter to remove sensor jitter & jumping
          const LERP_ALPHA = 0.35;
          const prev = smoothedReticleRef.current;
          let smoothPos: Point3D = { x: rawX, y: rawY, z: rawZ };

          if (prev) {
            const dx = rawX - prev.x;
            const dy = rawY - prev.y;
            const dz = rawZ - prev.z;
            const distSq = dx * dx + dy * dy + dz * dz;

            // If small movement (< 0.5m), apply smooth interpolation
            if (distSq < 0.25) {
              smoothPos = {
                x: Number((prev.x + dx * LERP_ALPHA).toFixed(4)),
                y: Number((prev.y + dy * LERP_ALPHA).toFixed(4)),
                z: Number((prev.z + dz * LERP_ALPHA).toFixed(4)),
              };
            }
          }

          smoothedReticleRef.current = smoothPos;

          // Throttle React state updates to 60fps (~16ms) to eliminate render bottlenecks
          const now = Date.now();
          if (now - lastStateUpdateRef.current > 16) {
            lastStateUpdateRef.current = now;
            setReticle3D(smoothPos);
            onReticlePositionUpdate(smoothPos);
            onTrackingStateChange("NORMAL");

            if (draggedHandleIndex !== null) {
              onHandleMoved(draggedHandleIndex, smoothPos);
            }
          }
          return;
        }
      }
    },
    [
      draggedHandleIndex,
      onHandleMoved,
      onReticlePositionUpdate,
      onTrackingStateChange,
    ],
  );

  // Fallback Camera Transform Update (if no plane is detected yet)
  const handleCameraTransformUpdate = useCallback(
    (event: any) => {
      const transform = event?.cameraTransform || event;
      if (
        transform?.position &&
        transform?.forward &&
        !hasExactPlaneRef.current
      ) {
        const pos = transform.position;
        const fwd = transform.forward;
        const hitPos: Point3D = {
          x: pos[0] + fwd[0] * 1.2,
          y: pos[1] + fwd[1] * 1.2,
          z: pos[2] + fwd[2] * 1.2,
        };
        smoothedReticleRef.current = hitPos;
        setReticle3D(hitPos);
        onReticlePositionUpdate(hitPos);
        onTrackingStateChange("NORMAL");

        if (draggedHandleIndex !== null) {
          onHandleMoved(draggedHandleIndex, hitPos);
        }
      }
    },
    [
      draggedHandleIndex,
      onHandleMoved,
      onReticlePositionUpdate,
      onTrackingStateChange,
    ],
  );

  // Tracking state change handler
  const handleTrackingUpdated = (state: any) => {
    if (
      state === ViroTrackingStateConstants.TRACKING_NORMAL ||
      state === 3 ||
      state === "TRACKING_NORMAL" ||
      state === "NORMAL"
    ) {
      onTrackingStateChange("NORMAL");
    } else if (
      state === ViroTrackingStateConstants.TRACKING_LIMITED ||
      state === 2 ||
      state === "TRACKING_LIMITED" ||
      state === "LIMITED"
    ) {
      onTrackingStateChange("LIMITED");
    } else {
      onTrackingStateChange("UNAVAILABLE");
    }
  };

  // Screen Tap / AR Click Handler
  const handleSceneClick = () => {
    const activeReticle = smoothedReticleRef.current || reticle3D;
    if (draggedHandleIndex !== null) {
      if (activeReticle) {
        onHandleDropped(draggedHandleIndex, activeReticle);
      }
      return;
    }

    if (hoveredHandleIndex !== null) {
      onHandleGrabbed(hoveredHandleIndex);
      return;
    }

    if (activeReticle) {
      onPointPlaced(activeReticle);
    }
  };

  // Live measurement distance & midpoint for 3D billboard text
  const activeReticle = smoothedReticleRef.current || reticle3D;
  let measurementMidpoint: Point3D | null = null;
  let activeDistance = 0;

  if (points.length >= 2 && points[0] && points[1]) {
    activeDistance = distance3D(points[0], points[1]);
    measurementMidpoint = {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2 + 0.06,
      z: (points[0].z + points[1].z) / 2,
    };
  } else if (points.length === 1 && points[0] && activeReticle) {
    activeDistance = distance3D(points[0], activeReticle);
    measurementMidpoint = {
      x: (points[0].x + activeReticle.x) / 2,
      y: (points[0].y + activeReticle.y) / 2 + 0.06,
      z: (points[0].z + activeReticle.z) / 2,
    };
  }

  const isDragging = draggedHandleIndex !== null;
  const isHovering = hoveredHandleIndex !== null && !isDragging;
  const reticleRingMat = isDragging
    ? "reticleRingDragged"
    : isHovering
      ? "reticleRingHover"
      : "reticleRingNormal";

  return (
    <ViroARScene
      anchorDetectionTypes={["PlanesHorizontal", "PlanesVertical"]}
      onCameraARHitTest={handleCameraARHitTest}
      onCameraTransformUpdate={handleCameraTransformUpdate}
      onTrackingUpdated={handleTrackingUpdated}
      onClick={handleSceneClick}
    >
      {/* 1. Locked Measurement Line (Point 1 -> Point 2) */}
      {points.length >= 2 && points[0] && points[1] && (
        <ViroPolyline
          position={[0, 0, 0]}
          points={[
            [points[0].x, points[0].y, points[0].z],
            [points[1].x, points[1].y, points[1].z],
          ]}
          thickness={0.008}
          materials={["laserLine"]}
        />
      )}

      {/* 2. Active Guidance Line (Point 1 -> Live Reticle) */}
      {points.length === 1 && points[0] && activeReticle && (
        <ViroPolyline
          position={[0, 0, 0]}
          points={[
            [points[0].x, points[0].y, points[0].z],
            [activeReticle.x, activeReticle.y, activeReticle.z],
          ]}
          thickness={0.005}
          materials={["activeGuideLine"]}
        />
      )}

      {/* 3. In-AR 3D Surface Reticle Ring (Lies Flat on the Physical Plane) */}
      {activeReticle && (
        <ViroNode
          position={[activeReticle.x, activeReticle.y, activeReticle.z]}
          rotation={reticleRotation}
        >
          {/* Outer Surface-conforming Ring */}
          <ViroPolyline
            position={[0, 0, 0]}
            points={outerRingPoints}
            thickness={0.004}
            materials={[reticleRingMat]}
          />
          {/* Inner Accent Ring */}
          <ViroPolyline
            position={[0, 0, 0]}
            points={innerRingPoints}
            thickness={0.0025}
            materials={[reticleRingMat]}
          />
          {/* Center Surface Target Point */}
          <ViroSphere radius={0.005} materials={["reticleCenterDot"]} />
        </ViroNode>
      )}

      {/* 4. Anchor Spheres (Point Handles) */}
      {points.map((p, idx) => {
        const isDragged = draggedHandleIndex === idx;
        const isHovered = hoveredHandleIndex === idx;
        const material = isDragged
          ? "draggedAnchor"
          : isHovered
            ? "hoveredAnchor"
            : "normalAnchor";
        const radius = isDragged ? 0.024 : isHovered ? 0.022 : 0.016;

        return (
          <ViroNode
            key={idx}
            position={[p.x, p.y, p.z]}
            onClick={() => onHandleGrabbed(idx)}
            onDrag={(newPos: [number, number, number]) => {
              onHandleMoved(idx, { x: newPos[0], y: newPos[1], z: newPos[2] });
            }}
            dragType="FixedToPlane"
          >
            <ViroSphere radius={radius} materials={[material]} />
          </ViroNode>
        );
      })}

      {/* 5. Camera-Facing In-AR 3D Spatial Billboard Text */}
      {measurementMidpoint && activeDistance > 0.001 && (
        <ViroNode
          position={[
            measurementMidpoint.x,
            measurementMidpoint.y,
            measurementMidpoint.z,
          ]}
          transformBehaviors={["billboard"]}
        >
          <ViroText
            text={formatDistance(activeDistance, unit, 2)}
            scale={[0.12, 0.12, 0.12]}
            style={styles.billboardText}
          />
        </ViroNode>
      )}
    </ViroARScene>
  );
}

const styles = StyleSheet.create({
  billboardText: {
    fontFamily: "System",
    fontSize: 28,
    color: "#ffffff",
    textAlignVertical: "center",
    textAlign: "center",
    fontWeight: "bold",
  },
});
