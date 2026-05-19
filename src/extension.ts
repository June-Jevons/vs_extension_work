import * as vscode from "vscode";
import { DashboardLauncherViewProvider, launcherViewId } from "./activityBar/dashboardLauncherView";
import { registerLiveArchitectureCommands } from "./commands/commandRegistry";
import { LiveArchitectureStateManager } from "./core/analysisEngine";
import { describePathKind, getLiveArchitectureOutputChannel, logInfo } from "./core/outputChannel";
import { BaselineStore } from "./storage/baselineStore";
import { SnapshotStore } from "./storage/snapshotStore";
import { DashboardMode, isDashboardMode } from "./webview/dashboardState";
import { DashboardPanel } from "./webview/dashboardPanel";
import { WorkspaceWatcher } from "./watchers/workspaceWatcher";

export interface LiveArchitectureMapApi {
  stateManager: LiveArchitectureStateManager;
  launcherViewProvider: DashboardLauncherViewProvider;
}

export function activate(context: vscode.ExtensionContext): LiveArchitectureMapApi {
  const outputChannel = getLiveArchitectureOutputChannel();
  logInfo("activation");
  logInfo(`extension mode=${extensionModeLabel(context.extensionMode)}`);
  logInfo(`extension path=${context.extensionPath}`);
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (folder) {
    logInfo(`workspace folder URI=${folder.uri.toString()}`);
    logInfo(`workspace fsPath=${folder.uri.fsPath}`);
    logInfo(`workspace path kind=${describePathKind(folder.uri.fsPath)}`);
  } else {
    logInfo("workspace folder URI=<none>");
  }

  const snapshotStore = new SnapshotStore(context);
  const baselineStore = new BaselineStore(context);
  const stateManager = new LiveArchitectureStateManager(context, snapshotStore, baselineStore);
  const watcher = new WorkspaceWatcher(stateManager);
  const launcherViewProvider = new DashboardLauncherViewProvider(context, stateManager);

  context.subscriptions.push(
    outputChannel,
    stateManager,
    watcher,
    launcherViewProvider,
    vscode.window.registerWebviewViewProvider(launcherViewId, launcherViewProvider, {
      webviewOptions: {
        retainContextWhenHidden: true
      }
    }),
    ...registerLiveArchitectureCommands(context, stateManager)
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
    stateManager,
    launcherViewProvider
  };
}

export function deactivate(): void {
  // VS Code disposes registered subscriptions from the extension context.
}

function extensionModeLabel(mode: vscode.ExtensionMode): string {
  switch (mode) {
    case vscode.ExtensionMode.Development:
      return "development";
    case vscode.ExtensionMode.Test:
      return "test";
    case vscode.ExtensionMode.Production:
      return "production";
  }
}
