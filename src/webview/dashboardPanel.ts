import * as vscode from "vscode";
import { createMockDashboardState } from "../mockData/mockDashboardState";
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

  private state = createMockDashboardState();

  private constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly panel: vscode.WebviewPanel
  ) {
    this.panel.onDidDispose(() => {
      DashboardPanel.currentPanel = undefined;
    }, undefined, this.context.subscriptions);

    this.panel.webview.onDidReceiveMessage(async (message: unknown) => {
      await this.handleMessage(message);
    }, undefined, this.context.subscriptions);
  }

  static show(
    context: vscode.ExtensionContext,
    mode: DashboardMode = "liveChanges",
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
      DashboardPanel.currentPanel = new DashboardPanel(context, panel);
    } else {
      DashboardPanel.currentPanel.panel.reveal(column);
    }

    DashboardPanel.currentPanel.setMode(mode, selectedFeatureId);
    return DashboardPanel.currentPanel.getCommandResult();
  }

  static refresh(context: vscode.ExtensionContext): DashboardCommandResult {
    if (!DashboardPanel.currentPanel) {
      return DashboardPanel.show(context);
    }
    DashboardPanel.currentPanel.render();
    return DashboardPanel.currentPanel.getCommandResult();
  }

  private setMode(mode: DashboardMode, selectedFeatureId?: string): void {
    this.state = createMockDashboardState(mode, selectedFeatureId ?? this.state.selectedFeatureId);
    this.panel.title = `Live Architecture Map: ${mode}`;
    this.render();
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
        await this.panel.webview.postMessage({ type: "state", state: this.state });
        return;
      case "setMode":
        this.setMode(message.mode);
        return;
      case "selectFeature":
        this.setMode("featureFocus", message.featureId);
        return;
      case "captureBaseline":
      case "showDiffSinceBaseline":
        this.setMode("diffSinceBaseline");
        return;
      case "refresh":
        this.render();
        return;
      case "exportSnapshot":
        await this.panel.webview.postMessage({
          type: "loading",
          message: "Export is intentionally not wired in the mock UI foundation."
        });
        return;
    }
  }

  private render(): void {
    this.panel.webview.html = getDashboardWebviewHtml(this.panel.webview, this.state, getNonce());
  }

  private getCommandResult(): DashboardCommandResult {
    return {
      opened: true,
      mode: this.state.mode,
      selectedFeatureId: this.state.selectedFeatureId,
      panelTitle: this.panel.title,
      viewType: this.panel.viewType,
      visible: this.panel.visible,
      active: this.panel.active,
      wroteWorkspaceFiles: false
    };
  }
}
