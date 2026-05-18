import { DashboardMode, DashboardState, isDashboardMode } from "./dashboardState";

export type WebviewToExtensionMessage =
  | { type: "ready" }
  | { type: "setMode"; mode: DashboardMode }
  | { type: "selectFeature"; featureId: string }
  | { type: "captureBaseline" }
  | { type: "refresh" }
  | { type: "showDiffSinceBaseline" }
  | { type: "exportSnapshot" }
  | { type: "configure" }
  | { type: "focusTimeline"; available: boolean };

export type ExtensionToWebviewMessage =
  | { type: "state"; state: DashboardState }
  | { type: "error"; message: string }
  | { type: "loading"; message: string };

export function isWebviewToExtensionMessage(value: unknown): value is WebviewToExtensionMessage {
  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }

  switch (value.type) {
    case "ready":
    case "captureBaseline":
    case "refresh":
    case "showDiffSinceBaseline":
    case "exportSnapshot":
    case "configure":
      return true;
    case "focusTimeline":
      return typeof value.available === "boolean";
    case "setMode":
      return isDashboardMode(value.mode);
    case "selectFeature":
      return typeof value.featureId === "string" && value.featureId.length > 0 && value.featureId.length < 120;
    default:
      return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
