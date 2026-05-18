import * as vscode from "vscode";
import { DashboardMode, isDashboardMode } from "../webview/dashboardState";
import { DashboardPanel } from "../webview/dashboardPanel";
import { LiveArchitectureSidebarProvider } from "../tree/sidebarProvider";
import { commandIds } from "./commands";

export function registerLiveArchitectureCommands(
  context: vscode.ExtensionContext,
  sidebarProvider: LiveArchitectureSidebarProvider
): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand(commandIds.openDashboard, (mode?: unknown) => {
      const dashboardMode = normalizeMode(mode) ?? "liveChanges";
      return DashboardPanel.show(context, dashboardMode);
    }),
    vscode.commands.registerCommand(commandIds.refresh, () => {
      sidebarProvider.refresh();
      return DashboardPanel.refresh(context);
    }),
    vscode.commands.registerCommand(commandIds.captureBaseline, () => {
      return DashboardPanel.show(context, "diffSinceBaseline");
    }),
    vscode.commands.registerCommand(commandIds.showDiffSinceBaseline, () => {
      return DashboardPanel.show(context, "diffSinceBaseline");
    }),
    vscode.commands.registerCommand(commandIds.focusFeature, (featureId?: unknown) => {
      const selectedFeatureId = typeof featureId === "string" && featureId.length > 0
        ? featureId
        : "motion-planning";
      return DashboardPanel.show(context, "featureFocus", selectedFeatureId);
    }),
    vscode.commands.registerCommand(commandIds.exportSnapshot, () => {
      return {
        exported: false,
        reason: "Export is not wired in the UI foundation pass.",
        wroteWorkspaceFiles: false
      };
    }),
    vscode.commands.registerCommand(commandIds.clearWorkspaceCache, () => {
      sidebarProvider.refresh();
      return {
        cleared: false,
        reason: "No extension-managed cache is wired in the UI foundation pass.",
        wroteWorkspaceFiles: false
      };
    }),
    vscode.commands.registerCommand(commandIds.openMockFile, async (relativePath?: unknown) => {
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
          reason: "Mock file does not exist in the current workspace.",
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
