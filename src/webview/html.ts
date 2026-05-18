import * as vscode from "vscode";
import { DashboardState } from "./dashboardState";
import { renderDashboardShell } from "./renderers";
import { getDashboardStyles } from "./styles";

export function getDashboardHtml(webview: vscode.Webview, state: DashboardState): string {
  const nonce = getNonce();
  const cspSource = webview.cspSource;

  return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
        <title>Live Architecture Map</title>
        <style nonce="${nonce}">
          ${getDashboardStyles()}
        </style>
      </head>
      <body>
        ${renderDashboardShell(state)}
        <script nonce="${nonce}">
          const vscode = acquireVsCodeApi();

          document.addEventListener('click', (event) => {
            const target = event.target instanceof Element ? event.target : null;
            if (!target) {
              return;
            }

            const modeButton = target.closest('[data-mode]');
            if (modeButton) {
              vscode.postMessage({ type: 'setMode', mode: modeButton.getAttribute('data-mode') });
              return;
            }

            const actionButton = target.closest('[data-action]');
            if (actionButton) {
              const action = actionButton.getAttribute('data-action');
              if (action === 'refresh') {
                vscode.postMessage({ type: 'refresh' });
              } else if (action === 'captureBaseline') {
                vscode.postMessage({ type: 'captureBaseline' });
              } else if (action === 'showDiffSinceBaseline') {
                vscode.postMessage({ type: 'showDiffSinceBaseline' });
              } else if (action === 'exportSnapshot') {
                vscode.postMessage({ type: 'exportSnapshot' });
              }
            }
          });

          const featureSelect = document.querySelector('[data-feature-select]');
          if (featureSelect) {
            featureSelect.addEventListener('change', (event) => {
              const select = event.target;
              vscode.postMessage({ type: 'selectFeature', featureId: select.value });
            });
          }

          vscode.postMessage({ type: 'ready' });
        </script>
      </body>
    </html>`;
}

function getNonce(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let index = 0; index < 32; index += 1) {
    nonce += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return nonce;
}
