import * as vscode from "vscode";
import { DashboardState } from "./dashboardState";
import { renderDashboardShell } from "./renderers";
import { dashboardStyles } from "./styles";

export function getDashboardWebviewHtml(
  webview: vscode.Webview,
  state: DashboardState,
  nonce: string
): string {
  const csp = [
    "default-src 'none'",
    `img-src ${webview.cspSource} data:`,
    `style-src 'nonce-${nonce}'`,
    `script-src 'nonce-${nonce}'`
  ].join("; ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>Live Architecture Map</title>
  <style nonce="${nonce}">${dashboardStyles}</style>
</head>
<body>
  <div id="app">${renderDashboardShell(state)}</div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    document.addEventListener("click", (event) => {
      const target = event.target.closest("[data-mode], [data-command], [data-feature-id]");
      if (!target) {
        return;
      }

      const mode = target.getAttribute("data-mode");
      if (mode) {
        vscode.postMessage({ type: "setMode", mode });
        return;
      }

      const featureId = target.getAttribute("data-feature-id");
      if (featureId) {
        vscode.postMessage({ type: "selectFeature", featureId });
        return;
      }

      const command = target.getAttribute("data-command");
      if (command === "refresh") {
        vscode.postMessage({ type: "refresh" });
      } else if (command === "captureBaseline") {
        vscode.postMessage({ type: "captureBaseline" });
      } else if (command === "showDiffSinceBaseline") {
        vscode.postMessage({ type: "showDiffSinceBaseline" });
      } else if (command === "exportSnapshot") {
        vscode.postMessage({ type: "exportSnapshot" });
      } else if (command === "configure") {
        vscode.postMessage({ type: "configure" });
      } else if (command === "focusTimeline") {
        const timeline = document.querySelector("[data-testid='structural-timeline']");
        if (timeline) {
          timeline.scrollIntoView({ behavior: "smooth", block: "center" });
          timeline.classList.add("focus-pulse");
          window.setTimeout(() => timeline.classList.remove("focus-pulse"), 1400);
        }
        vscode.postMessage({ type: "focusTimeline", available: Boolean(timeline) });
      }
    });

    document.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) {
        return;
      }
      if (target.getAttribute("data-command") === "selectFeature") {
        vscode.postMessage({ type: "selectFeature", featureId: target.value });
      }
    });

    vscode.postMessage({ type: "ready" });
  </script>
</body>
</html>`;
}

export function getNonce(): string {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
