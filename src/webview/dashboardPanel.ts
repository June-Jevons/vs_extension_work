import * as vscode from "vscode";
import { DashboardMode, DashboardState } from "./dashboardState";
import { getDashboardHtml } from "./html";
import { isWebviewToExtensionMessage } from "./messageProtocol";

export interface DashboardPanelCallbacks {
  setMode(mode: DashboardMode): void;
  selectFeature(featureId: string): void;
  refresh(): void;
  captureBaseline(): void;
  showDiffSinceBaseline(): void;
  exportSnapshot(): void;
}

export class DashboardPanel {
  public static currentPanel: DashboardPanel | undefined;

  private readonly disposables: vscode.Disposable[] = [];
  private callbacks: DashboardPanelCallbacks;
  private state: DashboardState;
  private readonly extensionUri: vscode.Uri;

  public static createOrShow(
    extensionUri: vscode.Uri,
    state: DashboardState,
    callbacks: DashboardPanelCallbacks
  ): DashboardPanel {
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

    if (DashboardPanel.currentPanel) {
      DashboardPanel.currentPanel.callbacks = callbacks;
      DashboardPanel.currentPanel.setState(state);
      DashboardPanel.currentPanel.panel.reveal(column);
      return DashboardPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      "liveArchitectureMap.dashboard",
      "Live Architecture Map",
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri]
      }
    );

    DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri, state, callbacks);
    return DashboardPanel.currentPanel;
  }

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    state: DashboardState,
    callbacks: DashboardPanelCallbacks
  ) {
    this.extensionUri = extensionUri;
    this.state = state;
    this.callbacks = callbacks;
    this.panel.iconPath = vscode.Uri.joinPath(this.extensionUri, "media", "icon.svg");
    this.updateHtml();

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage((message: unknown) => {
      if (!isWebviewToExtensionMessage(message)) {
        return;
      }

      switch (message.type) {
        case "ready":
          void this.panel.webview.postMessage({ type: "state", state: this.state });
          return;
        case "setMode":
          this.callbacks.setMode(message.mode);
          return;
        case "selectFeature":
          this.callbacks.selectFeature(message.featureId);
          return;
        case "refresh":
          this.callbacks.refresh();
          return;
        case "captureBaseline":
          this.callbacks.captureBaseline();
          return;
        case "showDiffSinceBaseline":
          this.callbacks.showDiffSinceBaseline();
          return;
        case "exportSnapshot":
          this.callbacks.exportSnapshot();
          return;
      }
    }, null, this.disposables);
  }

  public setState(state: DashboardState): void {
    this.state = state;
    this.updateHtml();
  }

  public dispose(): void {
    DashboardPanel.currentPanel = undefined;
    while (this.disposables.length > 0) {
      const disposable = this.disposables.pop();
      disposable?.dispose();
    }
  }

  private updateHtml(): void {
    this.panel.title = this.state.ui.modeLabels[this.state.mode];
    this.panel.webview.html = getDashboardHtml(this.panel.webview, this.state);
  }
}
