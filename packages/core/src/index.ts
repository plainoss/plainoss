/**
 * PlainOSS Core Engine
 * Platform-agnostic mathematical engines, algorithms, and pure utilities.
 */

export interface ToolMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  category: "astronomy" | "measurement" | "converter" | "developer" | "utility";
  tags: string[];
}

export const PLAINOSS_VERSION = "0.1.0";

// Re-export tools
export * as arRuler from "./ar-ruler/index";
export * from "./ar-ruler/index";
