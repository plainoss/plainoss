import { useCallback } from "react";
import * as Haptics from "expo-haptics";

export function useHaptics() {
  const selectionHaptic = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // Ignore if not supported on platform/simulator
    }
  }, []);

  const impactHaptic = useCallback(
    async (style: "light" | "medium" | "heavy" = "medium") => {
      try {
        const feedbackStyle =
          style === "heavy"
            ? Haptics.ImpactFeedbackStyle.Heavy
            : style === "light"
              ? Haptics.ImpactFeedbackStyle.Light
              : Haptics.ImpactFeedbackStyle.Medium;
        await Haptics.impactAsync(feedbackStyle);
      } catch {
        // Ignore
      }
    },
    [],
  );

  const successHaptic = useCallback(async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Ignore
    }
  }, []);

  const warningHaptic = useCallback(async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      // Ignore
    }
  }, []);

  return {
    selectionHaptic,
    impactHaptic,
    successHaptic,
    warningHaptic,
  };
}
