import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { MobileMeasurementRecord } from "../types/app";

export const formatRecordSummary = (rec: MobileMeasurementRecord): string => {
  const dateStr = new Date(rec.timestamp).toLocaleString();
  let details = `[${rec.mode.toUpperCase()}] ${rec.formatted} (${dateStr})`;
  if (rec.secondaryMetrics?.perimeter) {
    details += ` | Perimeter: ${rec.secondaryMetrics.perimeter}`;
  }
  if (rec.secondaryMetrics?.deltaX && rec.secondaryMetrics?.deltaY) {
    details += ` | ΔX:${rec.secondaryMetrics.deltaX} ΔY:${rec.secondaryMetrics.deltaY} ΔZ:${rec.secondaryMetrics.deltaZ || ""}`;
  }
  return details;
};

export const exportRecordsToText = (records: MobileMeasurementRecord[]): string => {
  if (records.length === 0) return "No measurement records to export.";
  const header = "=== AR Ruler (PlainOSS) Saved Measurements ===\n";
  const body = records.map((r, i) => `${i + 1}. ${formatRecordSummary(r)}`).join("\n");
  return `${header}\n${body}\n\nGenerated on ${new Date().toLocaleString()}`;
};

export const exportRecordsToCSV = (records: MobileMeasurementRecord[]): string => {
  const header = "ID,Mode,Value,Unit,Formatted,Timestamp,Date,PointsCount,Details\n";
  const rows = records.map((r) => {
    const date = new Date(r.timestamp).toISOString();
    const details = (r.secondaryMetrics?.perimeter ? `Perimeter: ${r.secondaryMetrics.perimeter}` : "")
      .replace(/"/g, '""');
    return `"${r.id}","${r.mode}","${r.value}","${r.unit}","${r.formatted}","${r.timestamp}","${date}","${r.points.length}","${details}"`;
  });
  return header + rows.join("\n");
};

export const copyRecordsToClipboard = async (
  records: MobileMeasurementRecord[]
): Promise<boolean> => {
  try {
    const text = exportRecordsToText(records);
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
};

export const shareRecordsAsFile = async (
  records: MobileMeasurementRecord[],
  format: "csv" | "json" = "csv"
): Promise<boolean> => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return await copyRecordsToClipboard(records);
    }

    const timestamp = Date.now();
    const filename = `ar-ruler-export-${timestamp}.${format}`;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    const content = format === "json"
      ? JSON.stringify(records, null, 2)
      : exportRecordsToCSV(records);

    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    await Sharing.shareAsync(fileUri, {
      mimeType: format === "json" ? "application/json" : "text/csv",
      dialogTitle: "Share AR Ruler Measurements",
      UTI: format === "json" ? "public.json" : "public.comma-separated-values-text",
    });

    return true;
  } catch (err) {
    console.error("Export share error:", err);
    return false;
  }
};
