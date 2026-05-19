import * as vscode from "vscode";
import { commandIds } from "../commands/commands";
import { LiveArchitectureStateManager } from "../core/analysisEngine";
import { DashboardPanel } from "../webview/dashboardPanel";

export const launcherViewId = "liveArchitectureMap.launcher";

export class DashboardLauncherViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private view: vscode.WebviewView | undefined;
  private lastHtmlKey = "";
  private lastAutoOpenAt = 0;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly stateManager: LiveArchitectureStateManager
  ) {
    this.disposables.push(
      this.stateManager.onDidChangeState(() => {
        this.render();
      })
    );
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = {
      enableScripts: true
    };

    this.disposables.push(
      view.onDidChangeVisibility(() => {
        if (view.visible) {
          this.openDashboardFromActivityBar();
        }
      }),
      view.webview.onDidReceiveMessage(async (message: unknown) => {
        await this.handleMessage(message);
      })
    );

    this.render();
    this.openDashboardFromActivityBar();
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  private async handleMessage(message: unknown): Promise<void> {
    if (!isLauncherMessage(message)) {
      return;
    }

    if (message.type === "openDashboard") {
      await this.stateManager.refresh();
      DashboardPanel.show(this.context, this.stateManager);
      return;
    }

    if (message.type === "refresh") {
      await vscode.commands.executeCommand(commandIds.refresh);
    }
  }

  private openDashboardFromActivityBar(): void {
    const now = Date.now();
    if (now - this.lastAutoOpenAt < 1500) {
      return;
    }
    this.lastAutoOpenAt = now;
    void this.stateManager.refresh().then(() => {
      DashboardPanel.show(this.context, this.stateManager);
    });
  }

  private render(): void {
    if (!this.view) {
      return;
    }

    const state = this.stateManager.getState();
    const status = state.error
      ? state.diagnostics.stateSource === "unavailable"
        ? "No workspace open"
        : "Error"
      : state.isMockData
        ? "Mock data"
        : "Live workspace data";
    const htmlKey = `${state.workspace.name}|${state.mode}|${status}|${state.diagnostics.changedFileCount}|${state.diagnostics.moduleCount}`;
    if (htmlKey === this.lastHtmlKey) {
      return;
    }

    const nonce = getNonce();
    this.view.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style nonce="${nonce}">
    body {
      margin: 0;
      padding: 12px;
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      font: var(--vscode-font-size) var(--vscode-font-family);
      user-select: text;
    }
    .launcher {
      display: grid;
      gap: 10px;
      min-width: 0;
    }
    h2 {
      margin: 0;
      font-size: 13px;
      font-weight: 650;
    }
    p {
      margin: 0;
      color: var(--vscode-descriptionForeground);
      overflow-wrap: anywhere;
    }
    .status {
      display: inline-flex;
      width: fit-content;
      padding: 2px 7px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      color: var(--vscode-foreground);
    }
    button {
      min-height: 28px;
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 4px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      cursor: pointer;
      font: inherit;
    }
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
  </style>
</head>
<body>
  <main class="launcher" data-testid="activitybar-launcher">
    <h2>Live Architecture Map</h2>
    <p>${escapeHtml(state.workspace.name)}</p>
    <span class="status">${escapeHtml(status)}</span>
    <button type="button" data-command="openDashboard">Open Dashboard</button>
    <button class="secondary" type="button" data-command="refresh">Refresh</button>
  </main>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.addEventListener("click", (event) => {
      const target = event.target.closest("[data-command]");
      if (!target) {
        return;
      }
      const command = target.getAttribute("data-command");
      if (command === "openDashboard") {
        vscode.postMessage({ type: "openDashboard" });
      } else if (command === "refresh") {
        vscode.postMessage({ type: "refresh" });
      }
    });
  </script>
</body>
</html>`;
    this.lastHtmlKey = htmlKey;
  }
}

function isLauncherMessage(value: unknown): value is { type: "openDashboard" | "refresh" } {
  return typeof value === "object"
    && value !== null
    && "type" in value
    && ((value as { type?: unknown }).type === "openDashboard" || (value as { type?: unknown }).type === "refresh");
}

function getNonce(): string {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
