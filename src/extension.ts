import * as vscode from "vscode";
import { registerLiveArchitectureCommands } from "./commands/commandRegistry";
import { DashboardMode, isDashboardMode } from "./webview/dashboardState";
import { DashboardPanel } from "./webview/dashboardPanel";
import { LiveArchitectureSidebarProvider } from "./tree/sidebarProvider";

export interface LiveArchitectureMapApi {
  sidebarProvider: LiveArchitectureSidebarProvider;
}

export function activate(context: vscode.ExtensionContext): LiveArchitectureMapApi {
  const sidebarProvider = new LiveArchitectureSidebarProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("liveArchitectureMap.sidebar", sidebarProvider),
    ...registerLiveArchitectureCommands(context, sidebarProvider)
  );

  const configuration = vscode.workspace.getConfiguration("liveArchitectureMap");
  const autoOpenDashboard = configuration.get<boolean>("autoOpenDashboard", false);
  if (autoOpenDashboard) {
    const configuredMode = configuration.get<string>("defaultModeWhenDirty", "liveChanges");
    const mode: DashboardMode = isDashboardMode(configuredMode) ? configuredMode : "liveChanges";
    DashboardPanel.show(context, mode);
  }

  return {
    sidebarProvider
  };
}

export function deactivate(): void {
  // No background scanner, watcher, or storage wiring exists in this first pass.
}
