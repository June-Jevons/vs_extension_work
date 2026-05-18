import * as vscode from "vscode";
import { AnalysisEngine } from "../core/analysisEngine";
import { SidebarProvider } from "../tree/sidebarProvider";
import { DashboardMode, DashboardState, isDashboardMode } from "../webview/dashboardState";
import { DashboardPanel } from "../webview/dashboardPanel";
import { normalizeOpenDashboardArg } from "./commands";

export interface CommandRegistryServices {
  context: vscode.ExtensionContext;
  output: vscode.OutputChannel;
  engine: AnalysisEngine;
  sidebarProvider: SidebarProvider;
  getState(): DashboardState;
  setState(state: DashboardState): void;
}

export function registerCommands(services: CommandRegistryServices): vscode.Disposable[] {
  const callbacks = {
    setMode: (mode: DashboardMode) => setMode(services, mode),
    selectFeature: (featureId: string) => selectFeature(services, featureId),
    refresh: () => refresh(services),
    captureBaseline: () => captureBaseline(services),
    showDiffSinceBaseline: () => setMode(services, "diffSinceBaseline"),
    exportSnapshot: () => void exportSnapshot(services)
  };

  return [
    vscode.commands.registerCommand("liveArchitectureMap.openDashboard", (arg?: unknown) => {
      const normalized = normalizeOpenDashboardArg(arg);
      if (normalized.mode && isDashboardMode(normalized.mode)) {
        setMode(services, normalized.mode, false);
      }
      DashboardPanel.createOrShow(services.context.extensionUri, services.getState(), callbacks);
    }),
    vscode.commands.registerCommand("liveArchitectureMap.refresh", () => refresh(services)),
    vscode.commands.registerCommand("liveArchitectureMap.captureBaseline", () => captureBaseline(services)),
    vscode.commands.registerCommand("liveArchitectureMap.showDiffSinceBaseline", () => {
      setMode(services, "diffSinceBaseline");
      DashboardPanel.createOrShow(services.context.extensionUri, services.getState(), callbacks);
    }),
    vscode.commands.registerCommand("liveArchitectureMap.focusFeature", async (featureId?: string) => {
      if (!featureId) {
        const pick = await vscode.window.showQuickPick(
          services.getState().ui.featureBlocks.map((feature) => ({ label: feature.label, description: feature.id, id: feature.id })),
          { placeHolder: "Select a feature to focus" }
        );
        featureId = pick?.id;
      }

      if (featureId) {
        selectFeature(services, featureId);
        DashboardPanel.createOrShow(services.context.extensionUri, services.getState(), callbacks);
      }
    }),
    vscode.commands.registerCommand("liveArchitectureMap.exportSnapshot", () => void exportSnapshot(services)),
    vscode.commands.registerCommand("liveArchitectureMap.clearWorkspaceCache", () => {
      services.output.appendLine("Mock cache clear requested. No extension cache exists in Phase 0-3.");
      void vscode.window.showInformationMessage("Live Architecture Map: no mock cache to clear yet.");
    }),
    vscode.commands.registerCommand("liveArchitectureMap.openChangedFile", async (path: string) => {
      await openChangedFile(path);
    })
  ];
}

function setMode(services: CommandRegistryServices, mode: DashboardMode, updatePanel = true): void {
  const current = services.getState();
  const next = services.engine.getMockState(mode, current.selectedFeatureId);
  services.setState(next);
  services.sidebarProvider.updateState(next);
  if (updatePanel) {
    DashboardPanel.currentPanel?.setState(next);
  }
}

function selectFeature(services: CommandRegistryServices, featureId: string): void {
  const next = services.engine.getMockState("featureFocus", featureId);
  services.setState(next);
  services.sidebarProvider.updateState(next);
  DashboardPanel.currentPanel?.setState(next);
}

function refresh(services: CommandRegistryServices): void {
  const current = services.getState();
  const next = services.engine.getMockState(current.mode, current.selectedFeatureId);
  services.output.appendLine(`Refresh requested in ${current.mode} mode. Phase 0-3 uses mock data only.`);
  services.setState(next);
  services.sidebarProvider.updateState(next);
  DashboardPanel.currentPanel?.setState(next);
}

function captureBaseline(services: CommandRegistryServices): void {
  services.output.appendLine("Mock baseline capture requested. Real extension storage starts in Phase 4.");
  void vscode.window.showInformationMessage("Live Architecture Map: mock baseline is already loaded for UI preview.");
}

async function exportSnapshot(services: CommandRegistryServices): Promise<void> {
  const targetUri = await vscode.window.showSaveDialog({
    title: "Export Live Architecture Map Snapshot",
    filters: {
      JSON: ["json"]
    }
  });

  if (!targetUri) {
    return;
  }

  const bytes = Buffer.from(JSON.stringify(services.getState().snapshot, null, 2), "utf8");
  await vscode.workspace.fs.writeFile(targetUri, bytes);
  services.output.appendLine(`Exported mock snapshot to ${targetUri.fsPath}`);
  void vscode.window.showInformationMessage("Live Architecture Map: snapshot exported.");
}

async function openChangedFile(relativePath: string): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!root) {
    void vscode.window.showWarningMessage("Open a workspace before opening changed files.");
    return;
  }

  const uri = vscode.Uri.joinPath(root, relativePath);
  try {
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
  } catch {
    void vscode.window.showWarningMessage(`Mock file is not present in this workspace: ${relativePath}`);
  }
}
