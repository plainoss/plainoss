import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, Animated, View } from "react-native";
import { CheckCircle2, Info, AlertTriangle } from "lucide-react-native";
import { THEME } from "../theme/colors";

export interface ToastMessage {
  id: string;
  text: string;
  type: "info" | "success" | "warning";
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

function SingleToast({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => onDismiss(toast.id));
    }, 2400);

    return () => clearTimeout(timer);
  }, [toast.id, opacity, translateY, onDismiss]);

  const IconComponent =
    toast.type === "success"
      ? CheckCircle2
      : toast.type === "warning"
        ? AlertTriangle
        : Info;

  const iconColor =
    toast.type === "success"
      ? THEME.accentGreen
      : toast.type === "warning"
        ? THEME.accentGold
        : THEME.accentCyan;

  return (
    <Animated.View
      style={[
        styles.toastCard,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <IconComponent size={18} color={iconColor} strokeWidth={2.2} />
      <Text style={styles.toastText}>{toast.text}</Text>
    </Animated.View>
  );
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {toasts.map((toast) => (
        <SingleToast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 96,
    left: 20,
    right: 20,
    alignItems: "center",
    zIndex: 999,
    gap: 8,
  },
  toastCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.bgSurface,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    color: THEME.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
});
