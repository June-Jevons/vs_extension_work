import { DashboardMode, DashboardState, isDashboardMode } from "./dashboardState";

export type WebviewToExtensionMessage =
  | { type: "ready" }
  | { type: "setMode"; mode: DashboardMode }
  | { type: "selectFeature"; featureId: string }
  | { type: "captureBaseline" }
  | { type: "refresh" }
  | { type: "showDiffSinceBaseline" }
  | { type: "exportSnapshot" };

export type ExtensionToWebviewMessage =
  | { type: "state"; state: DashboardState }
  | { type: "error"; message: string }
  | { type: "loading"; message: string };

export function isWebviewToExtensionMessage(value: unknown): value is WebviewToExtensionMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  switch (candidate.type) {
    case "ready":
    case "captureBaseline":
    case "refresh":
    case "showDiffSinceBaseline":
    case "exportSnapshot":
      return true;
    case "setMode":
      return isDashboardMode(candidate.mode);
    case "selectFeature":
      return typeof candidate.featureId === "string" && candidate.featureId.length > 0;
    default:
      return false;
  }
}
