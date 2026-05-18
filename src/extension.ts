import * as vscode from "vscode";
import { registerLiveArchitectureCommands } from "./commands/commandRegistry";
import { LiveArchitectureStateManager } from "./core/analysisEngine";
import { describePathKind, getLiveArchitectureOutputChannel, logInfo } from "./core/outputChannel";
import { BaselineStore } from "./storage/baselineStore";
import { SnapshotStore } from "./storage/snapshotStore";
import { DashboardMode, isDashboardMode } from "./webview/dashboardState";
import { DashboardPanel } from "./webview/dashboardPanel";
import { WorkspaceWatcher } from "./watchers/workspaceWatcher";
import { commandIds } from "./commands/commands";

export interface LiveArchitectureMapApi {
  statusBarItem: vscode.StatusBarItem;
  stateManager: LiveArchitectureStateManager;
}

export function activate(context: vscode.ExtensionContext): LiveArchitectureMapApi {
  const outputChannel = getLiveArchitectureOutputChannel();
  logInfo("activation");
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
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.name = "Live Architecture Map";
  statusBarItem.text = "$(map) Live Architecture Map";
  statusBarItem.tooltip = "Open Live Architecture Map dashboard";
  statusBarItem.command = commandIds.openDashboard;
  statusBarItem.show();

  context.subscriptions.push(
    outputChannel,
    stateManager,
    watcher,
    statusBarItem,
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
    statusBarItem,
    stateManager
  };
}

export function deactivate(): void {
  // VS Code disposes registered subscriptions from the extension context.
}
