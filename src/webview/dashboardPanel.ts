import * as vscode from "vscode";
import { createHash } from "crypto";
import { commandIds } from "../commands/commands";
import { LiveArchitectureStateManager } from "../core/analysisEngine";
import { logInfo } from "../core/outputChannel";
import { DashboardMode } from "./dashboardState";
import { getGraphStatsForMode } from "./graphStats";
import { getDashboardWebviewHtml, getNonce } from "./html";
import { isWebviewToExtensionMessage } from "./messageProtocol";
import { getWebviewBundleStatus } from "./webviewAssets";

export interface DashboardCommandResult {
  opened: boolean;
  mode: DashboardMode;
  selectedFeatureId?: string;
  panelTitle: string;
  viewType: string;
  visible: boolean;
  active: boolean;
  stateSource: string;
  scannerStatus: string;
  gitStatusSource: string;
  isMockData: boolean;
  error?: string;
  diagnosticReason?: string;
  webviewBundleStatus: "available" | "missing";
  wroteWorkspaceFiles: false;
}

export class DashboardPanel {
  private static currentPanel: DashboardPanel | undefined;
  private lastRenderedHash = "";
  private selectionActive = false;
  private pendingRender = false;
  private shellRendered = false;

  private constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly panel: vscode.WebviewPanel,
    private readonly stateManager: LiveArchitectureStateManager
  ) {
    this.panel.onDidDispose(() => {
      DashboardPanel.currentPanel = undefined;
    }, undefined, this.context.subscriptions);

    this.panel.webview.onDidReceiveMessage(async (message: unknown) => {
      await this.handleMessage(message);
    }, undefined, this.context.subscriptions);

    this.stateManager.onDidChangeState(() => {
      this.render({ respectSelection: true });
    }, undefined, this.context.subscriptions);
  }

  static show(
    context: vscode.ExtensionContext,
    stateManager: LiveArchitectureStateManager,
    mode?: DashboardMode,
    selectedFeatureId?: string
  ): DashboardCommandResult {
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

    if (!DashboardPanel.currentPanel) {
      const panel = vscode.window.createWebviewPanel(
        "liveArchitectureMap.dashboard",
        "Live Architecture Map",
        column,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [context.extensionUri]
        }
      );
      DashboardPanel.currentPanel = new DashboardPanel(context, panel, stateManager);
    } else {
      DashboardPanel.currentPanel.panel.reveal(column);
    }

    if (mode) {
      stateManager.setMode(mode, selectedFeatureId);
    } else if (selectedFeatureId) {
      stateManager.setMode("featureFocus", selectedFeatureId);
    }
    DashboardPanel.currentPanel.render({ force: true });
    const state = stateManager.getState();
    logInfo(`dashboard opened: mode=${state.mode}, stateSource=${state.diagnostics.stateSource}, isMockData=${state.isMockData}`);
    return DashboardPanel.currentPanel.getCommandResult();
  }

  static async refresh(
    context: vscode.ExtensionContext,
    stateManager: LiveArchitectureStateManager,
    mode?: DashboardMode
  ): Promise<DashboardCommandResult> {
    if (!DashboardPanel.currentPanel) {
      await stateManager.refresh(mode);
      return DashboardPanel.show(context, stateManager);
    }
    await stateManager.refresh(mode);
    DashboardPanel.currentPanel.render({ force: true });
    return DashboardPanel.currentPanel.getCommandResult();
  }

  private async handleMessage(message: unknown): Promise<void> {
    if (!isWebviewToExtensionMessage(message)) {
      await this.panel.webview.postMessage({
        type: "error",
        message: "Invalid dashboard message."
      });
      return;
    }

    switch (message.type) {
      case "ready":
        await this.panel.webview.postMessage({ type: "state", state: this.stateManager.getState() });
        return;
      case "selectionState":
        this.selectionActive = message.active;
        if (!this.selectionActive && this.pendingRender) {
          this.render({ force: true });
        }
        return;
      case "setMode":
        this.stateManager.setMode(message.mode);
        return;
      case "selectFeature":
        this.stateManager.setMode("featureFocus", message.featureId);
        return;
      case "captureBaseline":
        await this.stateManager.captureBaseline();
        return;
      case "showDiffSinceBaseline":
        await this.stateManager.refresh("diffSinceBaseline");
        return;
      case "refresh":
        await this.stateManager.refresh(this.stateManager.getState().mode);
        return;
      case "exportSnapshot":
        await vscode.commands.executeCommand(commandIds.exportSnapshot);
        return;
      case "configure":
        await vscode.commands.executeCommand(commandIds.configure);
        return;
      case "openWorkspaceFile":
        await vscode.commands.executeCommand(commandIds.openWorkspaceFile, message.path);
        return;
      case "focusTimeline":
        await vscode.commands.executeCommand(commandIds.focusTimeline);
        return;
    }
  }

  private render(options: { force?: boolean; respectSelection?: boolean } = {}): void {
    const state = this.stateManager.getState();
    const renderHash = getRenderHash(state);
    if (!options.force && renderHash === this.lastRenderedHash) {
      return;
    }
    if (options.respectSelection && this.selectionActive) {
      this.pendingRender = true;
      return;
    }
    const graphStats = getGraphStatsForMode(state);
    this.panel.title = `Live Architecture Map: ${state.mode}`;
    if (!this.shellRendered) {
      this.panel.webview.html = getDashboardWebviewHtml(this.panel.webview, this.context.extensionUri, getNonce());
      this.shellRendered = true;
    }
    void this.panel.webview.postMessage({ type: "state", state });
    this.lastRenderedHash = renderHash;
    this.pendingRender = false;
    logInfo(`dashboard render: title=${this.panel.title}, subtitleSource=${state.isMockData ? "mock" : "live"}, mockData=${state.isMockData}, graphNodes=${graphStats.nodes}, graphEdges=${graphStats.edges}, graphStats=${graphStats.summary}`);
  }

  private getCommandResult(): DashboardCommandResult {
    const state = this.stateManager.getState();
    return {
      opened: true,
      mode: state.mode,
      selectedFeatureId: state.selectedFeatureId,
      panelTitle: this.panel.title,
      viewType: this.panel.viewType,
      visible: this.panel.visible,
      active: this.panel.active,
      stateSource: state.diagnostics.stateSource,
      scannerStatus: state.diagnostics.scannerStatus,
      gitStatusSource: state.diagnostics.gitStatusSource,
      isMockData: state.isMockData,
      error: state.error,
      diagnosticReason: state.diagnostics.fallbackReason,
      webviewBundleStatus: getWebviewBundleStatus(this.context.extensionUri.fsPath).kind,
      wroteWorkspaceFiles: false
    };
  }
}

function getRenderHash(state: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(state, (_key, value: unknown) => {
      if (_key === "lastUpdatedIso" || _key === "capturedAtIso" || _key === "currentCapturedAtIso" || _key === "lastChangedIso") {
        return "<volatile-time>";
      }
      return value;
    }))
    .digest("hex");
}
