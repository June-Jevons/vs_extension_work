import type * as vscode from "vscode";
import { getWebviewAssetUris } from "./webviewAssets";

export function getDashboardWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  nonce: string
): string {
  const assets = getWebviewAssetUris(webview, extensionUri);
  const csp = [
    "default-src 'none'",
    `img-src ${webview.cspSource} data:`,
    `font-src ${webview.cspSource}`,
    `style-src ${webview.cspSource} 'nonce-${nonce}'`,
    `script-src ${webview.cspSource} 'nonce-${nonce}'`
  ].join("; ");

  if (assets.kind === "missing") {
    return renderMissingBundleHtml(csp, nonce, assets.message, assets.detail);
  }

  const styles = assets.styleUris
    .map((styleUri) => `  <link rel="stylesheet" href="${escapeAttribute(styleUri)}">`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>Live Architecture Map</title>
${styles}
</head>
<body>
  <div id="root" data-testid="react-webview-root">Loading Live Architecture Map...</div>
  <script type="module" nonce="${nonce}" src="${escapeAttribute(assets.scriptUri)}"></script>
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

function renderMissingBundleHtml(csp: string, nonce: string, message: string, detail: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>Live Architecture Map</title>
  <style nonce="${nonce}">
    body {
      margin: 0;
      min-height: 100vh;
      background: #101418;
      color: #e8edf2;
      font-family: system-ui, sans-serif;
      display: grid;
      place-items: center;
    }
    main {
      width: min(720px, calc(100vw - 48px));
      border: 1px solid #38424c;
      border-radius: 8px;
      padding: 24px;
      background: #171d23;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 20px;
    }
    p {
      margin: 8px 0 0;
      color: #bac6d1;
      line-height: 1.5;
    }
    code {
      color: #f3d27c;
    }
  </style>
</head>
<body>
  <main data-testid="webview-bundle-error">
    <h1>${escapeHtml(message)}</h1>
    <p>${escapeHtml(detail)}</p>
    <p>Build the React webview with <code>npm run compile:webview</code>, then reopen the dashboard.</p>
  </main>
</body>
</html>`;
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
