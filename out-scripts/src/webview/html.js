"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardWebviewHtml = getDashboardWebviewHtml;
exports.getNonce = getNonce;
const renderers_1 = require("./renderers");
const styles_1 = require("./styles");
function getDashboardWebviewHtml(webview, state, nonce) {
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
  <style nonce="${nonce}">${styles_1.dashboardStyles}</style>
</head>
<body>
  <div id="app">${(0, renderers_1.renderDashboardShell)(state)}</div>
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
function getNonce() {
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let text = "";
    for (let i = 0; i < 32; i += 1) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=html.js.map