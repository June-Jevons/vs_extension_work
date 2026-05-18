import * as vscode from "vscode";
import { LiveArchitectureStateManager } from "../core/analysisEngine";
import { DashboardMode } from "./dashboardState";
import { getDashboardWebviewHtml, getNonce } from "./html";
import { isWebviewToExtensionMessage } from "./messageProtocol";

export interface DashboardCommandResult {
  opened: boolean;
  mode: DashboardMode;
  selectedFeatureId?: string;
  panelTitle: string;
  viewType: string;
  visible: boolean;
  active: boolean;
  wroteWorkspaceFiles: false;
}

export class DashboardPanel {
  private static currentPanel: DashboardPanel | undefined;

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
      this.render();
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
    DashboardPanel.currentPanel.render();
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
    DashboardPanel.currentPanel.render();
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
        this.stateManager.setMode("diffSinceBaseline");
        return;
      case "refresh":
        await this.stateManager.refresh(this.stateManager.getState().mode);
        return;
      case "exportSnapshot":
        await this.panel.webview.postMessage({
          type: "loading",
          message: "Export remains intentionally deferred until Phase 11."
        });
        return;
    }
  }

  private render(): void {
    const state = this.stateManager.getState();
    this.panel.title = `Live Architecture Map: ${state.mode}`;
    this.panel.webview.html = getDashboardWebviewHtml(this.panel.webview, state, getNonce());
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
      wroteWorkspaceFiles: false
    };
  }
}
