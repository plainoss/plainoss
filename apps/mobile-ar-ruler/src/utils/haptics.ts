import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export const hapticImpactLight = async (enabled = true) => {
  if (!enabled || Platform.OS === "web") return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
};

export const hapticImpactMedium = async (enabled = true) => {
  if (!enabled || Platform.OS === "web") return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {}
};

export const hapticImpactHeavy = async (enabled = true) => {
  if (!enabled || Platform.OS === "web") return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {}
};

export const hapticSelection = async (enabled = true) => {
  if (!enabled || Platform.OS === "web") return;
  try {
    await Haptics.selectionAsync();
  } catch {}
};

export const hapticSuccess = async (enabled = true) => {
  if (!enabled || Platform.OS === "web") return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}
};

export const hapticWarning = async (enabled = true) => {
  if (!enabled || Platform.OS === "web") return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {}
};
