import React, { useState } from "react";
import { StyleSheet, View, BackHandler } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ViroARSceneNavigator } from "@reactvision/react-viro";
import { ARRulerScene } from "./src/ar/ARRulerScene";
import { ARRulerSceneProps } from "./src/ar/types";
import { initViroMaterials } from "./src/ar/materials";
import { TopBar } from "./src/components/TopBar";
import { BottomBar } from "./src/components/BottomBar";
import { Reticle } from "./src/components/Reticle";
import { ToastContainer } from "./src/components/Toast";
import { UnitPickerModal } from "./src/components/UnitPickerModal";
import { useARRuler } from "./src/hooks/useARRuler";

// Initialize 3D Materials for Viro AR
initViroMaterials();

export default function App() {
  const [unitModalVisible, setUnitModalVisible] = useState<boolean>(false);

  const {
    points,
    unit,
    draggedHandleIndex,
    hoveredHandleIndex,
    reticlePos,
    isScanning,
    toasts,
    dismissToast,
    handlePointPlaced,
    handleHandleGrabbed,
    handleHandleMoved,
    handleHandleDropped,
    handleReset,
    handleSelectUnit,
    handleReticlePositionUpdate,
    handleTrackingStateChange,
  } = useARRuler();

  const handleExit = () => {
    try {
      BackHandler.exitApp();
    } catch {
      // In sim/web
    }
  };

  const handleTriggerAction = () => {
    if (draggedHandleIndex !== null) {
      if (reticlePos) {
        handleHandleDropped(draggedHandleIndex, reticlePos);
      }
      return;
    }

    if (hoveredHandleIndex !== null) {
      handleHandleGrabbed(hoveredHandleIndex);
      return;
    }

    if (reticlePos) {
      handlePointPlaced(reticlePos);
    }
  };

  const viroAppProps: ARRulerSceneProps = {
    points,
    unit,
    draggedHandleIndex,
    hoveredHandleIndex,
    onPointPlaced: handlePointPlaced,
    onHandleGrabbed: handleHandleGrabbed,
    onHandleMoved: handleHandleMoved,
    onHandleDropped: handleHandleDropped,
    onTrackingStateChange: handleTrackingStateChange,
    onReticlePositionUpdate: handleReticlePositionUpdate,
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* AR Viewport */}
      <ViroARSceneNavigator
        autofocus={true}
        initialScene={{
          scene: ARRulerScene as any,
        }}
        viroAppProps={viroAppProps}
        style={styles.arView}
      />

      {/* Dynamic Center Reticle */}
      <Reticle
        isScanning={isScanning}
        isHoveringHandle={hoveredHandleIndex !== null}
        isDraggingHandle={draggedHandleIndex !== null}
      />

      {/* Top HUD Bar: [Exit] --- [Status Pill] --- [Clear] */}
      <TopBar
        isScanning={isScanning}
        pointsCount={points.length}
        hoveredHandleIndex={hoveredHandleIndex}
        draggedHandleIndex={draggedHandleIndex}
        onExit={handleExit}
        onReset={handleReset}
      />

      {/* Bottom HUD Bar: [Unit Selector Badge] + [Placement Trigger] */}
      <BottomBar
        unit={unit}
        draggedHandleIndex={draggedHandleIndex}
        hoveredHandleIndex={hoveredHandleIndex}
        onOpenUnitPicker={() => setUnitModalVisible(true)}
        onTriggerAction={handleTriggerAction}
      />

      {/* Unit Selector Modal Sheet */}
      <UnitPickerModal
        visible={unitModalVisible}
        selectedUnit={unit}
        onSelectUnit={handleSelectUnit}
        onClose={() => setUnitModalVisible(false)}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  arView: {
    ...StyleSheet.absoluteFillObject,
  },
});
