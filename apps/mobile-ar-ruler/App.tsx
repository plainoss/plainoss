import React, { useState, useCallback } from "react";
import { StyleSheet, SafeAreaView, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { AppSettings } from "./src/types/app";
import { useCameraPermission } from "./src/hooks/useCameraPermission";
import { useDeviceSensors } from "./src/hooks/useDeviceSensors";
import { usePersistentHistory } from "./src/hooks/usePersistentHistory";
import { useARMeasurement } from "./src/hooks/useARMeasurement";

import { Header } from "./src/components/Header";
import { CameraViewfinder } from "./src/components/Viewfinder/CameraViewfinder";
import { MeasurementCard } from "./src/components/HUD/MeasurementCard";
import { LevelHUD } from "./src/components/HUD/LevelHUD";
import { ModeSelector } from "./src/components/Controls/ModeSelector";
import { UnitSelector } from "./src/components/Controls/UnitSelector";
import { ActionToolbar } from "./src/components/Controls/ActionToolbar";

import { HistoryModal } from "./src/components/Modals/HistoryModal";
import { SettingsModal } from "./src/components/Modals/SettingsModal";
import { HelpGuideModal } from "./src/components/Modals/HelpGuideModal";

export default function App() {
  // App Settings
  const [settings, setSettings] = useState<AppSettings>({
    precision: 2,
    defaultUnit: "m",
    defaultAngleUnit: "deg",
    hapticsEnabled: true,
    gridEnabled: false,
    torchDefault: false,
  });

  // Modal dialog states
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Hardware and Sensor hooks
  const camera = useCameraPermission();
  const orientation = useDeviceSensors();
  const { history, saveRecord, deleteRecord, clearHistory } = usePersistentHistory();

  // AR Measurement state machine
  const measurement = useARMeasurement({
    orientation,
    hapticsEnabled: settings.hapticsEnabled,
  });

  const handleUpdateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const handleSaveMeasurement = useCallback(async () => {
    const record = measurement.createCurrentRecord();
    if (record) {
      await saveRecord(record);
      measurement.clearPoints();
    }
  }, [measurement, saveRecord]);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar style="light" />

      {/* Top Header */}
      <Header
        torch={camera.torch}
        hasCamera={camera.isGranted}
        onToggleTorch={camera.toggleTorch}
        historyCount={history.length}
        onOpenHistory={() => setShowHistory(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenHelp={() => setShowHelp(true)}
      />

      {/* Measurement Mode Selector Carousel */}
      <ModeSelector
        currentMode={measurement.mode}
        onSelectMode={measurement.setMode}
      />

      {/* Main Viewfinder / Spatial Canvas */}
      {measurement.mode === "level" ? (
        <View style={styles.levelContainer}>
          <LevelHUD orientation={orientation} />
        </View>
      ) : (
        <CameraViewfinder
          hasPermission={camera.isGranted}
          canRequest={camera.canAskAgain}
          onRequestPermission={camera.requestPermission}
          torch={camera.torch}
          facing={camera.facing}
          points={measurement.points}
          mode={measurement.mode}
          unit={measurement.unit}
          targetDistance={measurement.targetDistance}
          onChangeDistance={measurement.setTargetDistance}
          isLevel={orientation.isLevel}
          isVertical={orientation.isVertical}
          gridEnabled={settings.gridEnabled}
        />
      )}

      {/* Unit Selector */}
      <UnitSelector
        mode={measurement.mode}
        unit={measurement.unit}
        angleUnit={measurement.angleUnit}
        onSelectUnit={measurement.setUnit}
        onSelectAngleUnit={measurement.setAngleUnit}
      />

      {/* Measurement HUD Card */}
      <MeasurementCard
        title={measurement.calculation.title}
        primaryValue={measurement.calculation.primaryValue}
        primaryUnit={measurement.calculation.primaryUnitStr}
        pointsCount={measurement.points.length}
        mode={measurement.mode}
        secondaryMetrics={measurement.calculation.secondary}
      />

      {/* Bottom Action Controls */}
      <ActionToolbar
        mode={measurement.mode}
        pointsCount={measurement.points.length}
        isReadyToSave={measurement.calculation.isReady}
        onDropPoint={measurement.dropPoint}
        onUndo={measurement.undoPoint}
        onClear={measurement.clearPoints}
        onSave={handleSaveMeasurement}
      />

      {/* Modals */}
      <HistoryModal
        visible={showHistory}
        history={history}
        onClose={() => setShowHistory(false)}
        onDeleteRecord={deleteRecord}
        onClearHistory={clearHistory}
      />

      <SettingsModal
        visible={showSettings}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onClose={() => setShowSettings(false)}
      />

      <HelpGuideModal
        visible={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  levelContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 20,
    backgroundColor: "#0d0d12",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
});
