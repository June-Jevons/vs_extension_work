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
    let selectionActive = false;
    let selectionTimer;

    document.addEventListener("click", (event) => {
      const graphControl = event.target.closest("[data-graph-action]");
      if (graphControl) {
        handleGraphControl(graphControl);
        return;
      }

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

    function handleGraphControl(control) {
      const panel = control.closest("[data-graph-panel]");
      const svg = panel ? panel.querySelector("svg.graph-svg") : undefined;
      if (!svg) {
        return;
      }

      const action = control.getAttribute("data-graph-action");
      const fitViewBox = svg.getAttribute("data-fit-viewbox") || svg.getAttribute("viewBox");
      const currentViewBox = parseViewBox(svg.getAttribute("viewBox") || fitViewBox);
      if (!currentViewBox || !fitViewBox) {
        return;
      }

      if (action === "reset") {
        svg.setAttribute("viewBox", fitViewBox);
        svg.dataset.zoom = "1";
        return;
      }

      const factor = action === "zoom-in" ? 0.8 : action === "zoom-out" ? 1.25 : 1;
      const nextWidth = currentViewBox.width * factor;
      const nextHeight = currentViewBox.height * factor;
      const centerX = currentViewBox.x + currentViewBox.width / 2;
      const centerY = currentViewBox.y + currentViewBox.height / 2;
      const next = {
        x: centerX - nextWidth / 2,
        y: centerY - nextHeight / 2,
        width: nextWidth,
        height: nextHeight
      };
      svg.setAttribute("viewBox", formatViewBox(next));
      svg.dataset.zoom = String(Number(svg.dataset.zoom || "1") / factor);
    }

    function parseViewBox(value) {
      if (!value) {
        return undefined;
      }
      const parts = value.trim().split(/\\s+/).map(Number);
      if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
        return undefined;
      }
      return {
        x: parts[0],
        y: parts[1],
        width: parts[2],
        height: parts[3]
      };
    }

    function formatViewBox(viewBox) {
      return [
        viewBox.x.toFixed(2),
        viewBox.y.toFixed(2),
        viewBox.width.toFixed(2),
        viewBox.height.toFixed(2)
      ].join(" ");
    }

    document.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) {
        return;
      }
      if (target.getAttribute("data-command") === "selectFeature") {
        vscode.postMessage({ type: "selectFeature", featureId: target.value });
      }
    });

    document.addEventListener("selectionchange", () => {
      window.clearTimeout(selectionTimer);
      selectionTimer = window.setTimeout(() => {
        const selection = window.getSelection();
        const active = Boolean(selection && selection.toString().length > 0);
        if (active !== selectionActive) {
          selectionActive = active;
          vscode.postMessage({ type: "selectionState", active });
        }
      }, 80);
    });

    document.addEventListener("mouseup", () => {
      const selection = window.getSelection();
      const active = Boolean(selection && selection.toString().length > 0);
      if (active !== selectionActive) {
        selectionActive = active;
        vscode.postMessage({ type: "selectionState", active });
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
