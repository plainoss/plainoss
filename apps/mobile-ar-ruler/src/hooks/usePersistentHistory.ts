import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MobileMeasurementRecord } from "../types/app";

const STORAGE_KEY = "@plainoss_ar_ruler_history_v1";

export function usePersistentHistory() {
  const [history, setHistory] = useState<MobileMeasurementRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load history on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setHistory(parsed);
          }
        }
      } catch (err) {
        console.error("Failed to load measurements from AsyncStorage:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const saveRecord = useCallback(async (record: MobileMeasurementRecord) => {
    setHistory((prev) => {
      const updated = [record, ...prev];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch((err) =>
        console.error("Failed to persist record:", err),
      );
      return updated;
    });
  }, []);

  const deleteRecord = useCallback(async (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch((err) =>
        console.error("Failed to update AsyncStorage on delete:", err),
      );
      return updated;
    });
  }, []);

  const clearHistory = useCallback(async () => {
    setHistory([]);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error("Failed to clear AsyncStorage:", err);
    }
  }, []);

  return {
    history,
    isLoading,
    saveRecord,
    deleteRecord,
    clearHistory,
  };
}
