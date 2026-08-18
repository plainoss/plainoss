import { useState, useCallback } from "react";
import { useCameraPermissions } from "expo-camera";

export function useCameraPermission() {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState<boolean>(false);
  const [facing, setFacing] = useState<"back" | "front">("back");

  const toggleTorch = useCallback(() => {
    setTorch((prev) => !prev);
  }, []);

  const toggleFacing = useCallback(() => {
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  }, []);

  return {
    permission,
    isGranted: permission?.granted ?? false,
    canAskAgain: permission?.canAskAgain ?? true,
    requestPermission,
    torch,
    toggleTorch,
    facing,
    toggleFacing,
  };
}
