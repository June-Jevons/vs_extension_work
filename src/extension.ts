import * as vscode from "vscode";
import { AnalysisEngine } from "./core/analysisEngine";
import { registerCommands } from "./commands/commandRegistry";
import { SidebarProvider } from "./tree/sidebarProvider";
import { DashboardState } from "./webview/dashboardState";
import { DashboardPanel } from "./webview/dashboardPanel";

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("Live Architecture Map");
  const engine = new AnalysisEngine();
  let state: DashboardState = engine.getMockState("liveChanges");
  const sidebarProvider = new SidebarProvider(state);

  output.appendLine("Live Architecture Map activated in mock UI mode.");
  output.appendLine(`Workspace root: ${vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "none"}`);

  context.subscriptions.push(output);
  context.subscriptions.push(vscode.window.registerTreeDataProvider("liveArchitectureMap.sidebar", sidebarProvider));

  const commandDisposables = registerCommands({
    context,
    output,
    engine,
    sidebarProvider,
    getState: () => state,
    setState: (nextState) => {
      state = nextState;
    }
  });
  context.subscriptions.push(...commandDisposables);

  const configuration = vscode.workspace.getConfiguration("liveArchitectureMap");
  if (configuration.get<boolean>("autoOpenDashboard", false)) {
    DashboardPanel.createOrShow(context.extensionUri, state, {
      setMode: (mode) => void vscode.commands.executeCommand("liveArchitectureMap.openDashboard", mode),
      selectFeature: (featureId) => void vscode.commands.executeCommand("liveArchitectureMap.focusFeature", featureId),
      refresh: () => void vscode.commands.executeCommand("liveArchitectureMap.refresh"),
      captureBaseline: () => void vscode.commands.executeCommand("liveArchitectureMap.captureBaseline"),
      showDiffSinceBaseline: () => void vscode.commands.executeCommand("liveArchitectureMap.showDiffSinceBaseline"),
      exportSnapshot: () => void vscode.commands.executeCommand("liveArchitectureMap.exportSnapshot")
    });
  }
}

export function deactivate(): void {
  return;
}
