import { DashboardMode } from "../webview/dashboardState";

export interface OpenDashboardArgs {
  mode?: DashboardMode;
}

export function normalizeOpenDashboardArg(value: unknown): OpenDashboardArgs {
  if (typeof value === "string") {
    return { mode: value as DashboardMode };
  }
  if (value && typeof value === "object" && "mode" in value) {
    return value as OpenDashboardArgs;
  }
  return {};
}
