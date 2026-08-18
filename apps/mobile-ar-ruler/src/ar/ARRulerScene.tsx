import React, { useState, useCallback, useRef } from "react";
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
  const hasExactPlaneRef = useRef<boolean>(false);

  // Native Continuous Camera Ray Hit-Testing
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
          const [x, y, z] = planeHit.transform.position;
          const hitPos: Point3D = { x, y, z };
          hasExactPlaneRef.current = true;
          setReticle3D(hitPos);
          onReticlePositionUpdate(hitPos);
          onTrackingStateChange("NORMAL");

          if (draggedHandleIndex !== null) {
            onHandleMoved(draggedHandleIndex, hitPos);
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

  // Fallback Camera Transform Update (Ensures targeting cursor is always active)
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
        // Project 1.2m forward from camera
        const hitPos: Point3D = {
          x: pos[0] + fwd[0] * 1.2,
          y: pos[1] + fwd[1] * 1.2,
          z: pos[2] + fwd[2] * 1.2,
        };
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
    if (draggedHandleIndex !== null) {
      // If currently dragging, drop and lock handle
      if (reticle3D) {
        onHandleDropped(draggedHandleIndex, reticle3D);
      }
      return;
    }

    if (hoveredHandleIndex !== null) {
      // If aiming at handle, grab it
      onHandleGrabbed(hoveredHandleIndex);
      return;
    }

    if (reticle3D) {
      onPointPlaced(reticle3D);
    }
  };

  // Measurement distance & midpoint for 3D in-AR billboard
  let measurementMidpoint: Point3D | null = null;
  let activeDistance = 0;

  if (points.length >= 2 && points[0] && points[1]) {
    activeDistance = distance3D(points[0], points[1]);
    measurementMidpoint = {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2 + 0.05,
      z: (points[0].z + points[1].z) / 2,
    };
  } else if (points.length === 1 && points[0] && reticle3D) {
    activeDistance = distance3D(points[0], reticle3D);
    measurementMidpoint = {
      x: reticle3D.x,
      y: reticle3D.y + 0.06,
      z: reticle3D.z,
    };
  }

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

      {/* 2. Active Guidance Line (Point 1 -> Reticle) */}
      {points.length === 1 && points[0] && reticle3D && (
        <ViroPolyline
          position={[0, 0, 0]}
          points={[
            [points[0].x, points[0].y, points[0].z],
            [reticle3D.x, reticle3D.y, reticle3D.z],
          ]}
          thickness={0.005}
          materials={["activeGuideLine"]}
        />
      )}

      {/* 3. Anchor Spheres (Point Handles) */}
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

      {/* 4. Camera-Facing In-AR 3D Spatial Billboard Text */}
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
