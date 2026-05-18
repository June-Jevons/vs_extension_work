import * as vscode from "vscode";
import { registerLiveArchitectureCommands } from "./commands/commandRegistry";
import { LiveArchitectureStateManager } from "./core/analysisEngine";
import { BaselineStore } from "./storage/baselineStore";
import { SnapshotStore } from "./storage/snapshotStore";
import { DashboardMode, isDashboardMode } from "./webview/dashboardState";
import { DashboardPanel } from "./webview/dashboardPanel";
import { LiveArchitectureSidebarProvider } from "./tree/sidebarProvider";
import { WorkspaceWatcher } from "./watchers/workspaceWatcher";

export interface LiveArchitectureMapApi {
  sidebarProvider: LiveArchitectureSidebarProvider;
  stateManager: LiveArchitectureStateManager;
}

export function activate(context: vscode.ExtensionContext): LiveArchitectureMapApi {
  const snapshotStore = new SnapshotStore(context);
  const baselineStore = new BaselineStore(context);
  const stateManager = new LiveArchitectureStateManager(context, snapshotStore, baselineStore);
  const sidebarProvider = new LiveArchitectureSidebarProvider(stateManager);
  const watcher = new WorkspaceWatcher(stateManager);

  context.subscriptions.push(
    stateManager,
    watcher,
    vscode.window.registerTreeDataProvider("liveArchitectureMap.sidebar", sidebarProvider),
    ...registerLiveArchitectureCommands(context, sidebarProvider, stateManager)
  );

  watcher.start();
  void stateManager.refresh();

  const configuration = vscode.workspace.getConfiguration("liveArchitectureMap");
  const autoOpenDashboard = configuration.get<boolean>("autoOpenDashboard", false);
  if (autoOpenDashboard) {
    const configuredMode = configuration.get<string>("defaultModeWhenDirty", "liveChanges");
    const mode: DashboardMode = isDashboardMode(configuredMode) ? configuredMode : "liveChanges";
    void stateManager.refresh(mode).then(() => {
      DashboardPanel.show(context, stateManager);
    });
  }

  return {
    sidebarProvider,
    stateManager
  };
}

export function deactivate(): void {
  // VS Code disposes registered subscriptions from the extension context.
}
