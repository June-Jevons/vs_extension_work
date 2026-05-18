import * as vscode from "vscode";
import { LiveArchitectureStateManager } from "../core/analysisEngine";
import { DashboardMode, isDashboardMode } from "../webview/dashboardState";
import { DashboardPanel } from "../webview/dashboardPanel";
import { exportSnapshotAsJson, ExportSnapshotOptions } from "../storage/exportSnapshot";
import { commandIds } from "./commands";

export function registerLiveArchitectureCommands(
  context: vscode.ExtensionContext,
  stateManager: LiveArchitectureStateManager
): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand(commandIds.openDashboard, async (mode?: unknown) => {
      const dashboardMode = normalizeMode(mode);
      await stateManager.refresh(dashboardMode);
      return DashboardPanel.show(context, stateManager, dashboardMode);
    }),
    vscode.commands.registerCommand(commandIds.refresh, async () => {
      const currentMode = stateManager.getState().mode;
      const result = await DashboardPanel.refresh(context, stateManager, currentMode);
      return result;
    }),
    vscode.commands.registerCommand(commandIds.captureBaseline, async () => {
      const result = await stateManager.captureBaseline();
      const dashboard = DashboardPanel.show(context, stateManager);
      return {
        ...result,
        dashboard
      };
    }),
    vscode.commands.registerCommand(commandIds.showDiffSinceBaseline, async () => {
      await stateManager.refresh("diffSinceBaseline");
      return DashboardPanel.show(context, stateManager);
    }),
    vscode.commands.registerCommand(commandIds.focusFeature, async (featureId?: unknown) => {
      const selectedFeatureId = typeof featureId === "string" && featureId.length > 0
        ? featureId
        : "motion-planning";
      await stateManager.refresh("featureFocus", selectedFeatureId);
      return DashboardPanel.show(context, stateManager);
    }),
    vscode.commands.registerCommand(commandIds.exportSnapshot, async (options?: unknown) => {
      return exportSnapshotAsJson(context, stateManager.getState(), parseExportOptions(options));
    }),
    vscode.commands.registerCommand(commandIds.configure, async () => {
      await vscode.commands.executeCommand("workbench.action.openSettings", "liveArchitectureMap");
      return {
        configured: true,
        action: "workbench.action.openSettings",
        filter: "liveArchitectureMap",
        wroteWorkspaceFiles: false
      };
    }),
    vscode.commands.registerCommand(commandIds.focusTimeline, async () => {
      const state = stateManager.getState();
      if (state.mode === "diffSinceBaseline" && state.baselineDiff) {
        return {
          focused: true,
          message: "Structural timeline is visible in Diff Since Baseline mode.",
          wroteWorkspaceFiles: false
        };
      }

      const message = "Timeline is visible in Diff Since Baseline mode after a baseline is captured.";
      void vscode.window.showInformationMessage(message);
      return {
        focused: false,
        message,
        wroteWorkspaceFiles: false
      };
    }),
    vscode.commands.registerCommand(commandIds.clearWorkspaceCache, async () => {
      const result = await stateManager.clearWorkspaceCache();
      return result;
    }),
    vscode.commands.registerCommand(commandIds.openWorkspaceFile, async (relativePath?: unknown) => {
      if (typeof relativePath !== "string" || relativePath.length === 0) {
        return {
          opened: false,
          reason: "No file path was provided.",
          wroteWorkspaceFiles: false
        };
      }

      const folder = vscode.workspace.workspaceFolders?.[0];
      if (!folder) {
        return {
          opened: false,
          reason: "No workspace folder is open.",
          wroteWorkspaceFiles: false
        };
      }

      const fileUri = vscode.Uri.joinPath(folder.uri, ...relativePath.split("/"));
      try {
        await vscode.workspace.fs.stat(fileUri);
        const document = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(document, { preview: true });
        return {
          opened: true,
          path: relativePath,
          wroteWorkspaceFiles: false
        };
      } catch {
        return {
          opened: false,
          path: relativePath,
          reason: "File does not exist in the current workspace.",
          wroteWorkspaceFiles: false
        };
      }
    })
  ];
}

function normalizeMode(value: unknown): DashboardMode | undefined {
  if (isDashboardMode(value)) {
    return value;
  }

  if (typeof value === "object" && value !== null && "mode" in value) {
    const possibleMode = (value as { mode?: unknown }).mode;
    if (isDashboardMode(possibleMode)) {
      return possibleMode;
    }
  }

  return undefined;
}

function parseExportOptions(value: unknown): ExportSnapshotOptions | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const simulateCancel = "simulateCancel" in value && value.simulateCancel === true;
  return {
    simulateCancel
  };
}
